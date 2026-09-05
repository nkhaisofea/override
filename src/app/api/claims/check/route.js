import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { embedText, checkClaim, verdictToRiskLevel } from "@/lib/gemini";
import { topMatches } from "@/lib/similarity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { maybeCreateAutoFaq } from "@/lib/autoFaq";

const MAX_CLAIM_LENGTH = 2000;
const SUPPORTED_LANGUAGES = ["ms", "en", "zh"];

export async function POST(request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`check:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const language = SUPPORTED_LANGUAGES.includes(body.language) ? body.language : "en";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null;

  if (!text) {
    return NextResponse.json({ error: "Please paste a message to check." }, { status: 400 });
  }
  if (text.length > MAX_CLAIM_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_CLAIM_LENGTH} characters).` },
      { status: 400 }
    );
  }

  try {
    const { claims, sources } = await getCollections();

    // 1. Embed the incoming message.
    const embedding = await embedText(text);

    // 2. Retrieve the most relevant trusted sources (manual cosine similarity
    //    over a small collection — no vector DB needed at this scale).
    const allSources = await sources
      .find({}, { projection: { title: 1, text: 1, url: 1, embedding: 1 } })
      .toArray();
    const matched = topMatches(embedding, allSources, { limit: 3, minScore: 0.55 });

    // 3. Ask Gemini for a grounded verdict.
    const result = await checkClaim({
      rawMessage: text,
      language,
      sources: matched.map((m) => ({ title: m.title, text: m.text, url: m.url })),
    });

    const riskLevel = verdictToRiskLevel(result.verdict);
    const topSource = matched.find((m) => m.title === result.citedSourceTitle) || matched[0] || null;
    const sourceCitation = topSource
      ? { title: topSource.title, url: topSource.url }
      : null;

    // 4. Save the check.
    const claimDoc = {
      text,
      language,
      verdict: result.verdict,
      riskLevel,
      explanation: result.explanation,
      claim: result.claim,
      sourceId: topSource?._id || null,
      sourceCitation,
      embedding,
      sessionId,
      createdAt: new Date(),
      overriddenBy: null,
      overrideNote: null,
    };
    const inserted = await claims.insertOne(claimDoc);

    // 5. Auto-FAQ clustering check — best-effort, never blocks the response.
    maybeCreateAutoFaq({ newClaimDoc: { _id: inserted.insertedId, ...claimDoc } }).catch(() => {});

    return NextResponse.json({
      id: inserted.insertedId.toString(),
      claim: result.claim,
      verdict: result.verdict,
      riskLevel,
      explanation: result.explanation,
      sourceCitation,
      language,
    });
  } catch (err) {
    console.error("[/api/claims/check] error:", err);
    return NextResponse.json(
      { error: "Something went wrong while checking this claim. Please try again." },
      { status: 500 }
    );
  }
}
