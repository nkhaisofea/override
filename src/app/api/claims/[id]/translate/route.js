import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, DatabaseUnavailableError } from "@/lib/mongodb";
import { translateResult, GeminiError } from "@/lib/gemini";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

// Translate an existing result into another language.
//
// Translations are cached on the claim document under `translations.<lang>`,
// so each language costs one generation per claim, once, ever. After that,
// switching language on the result page — including for a different visitor
// opening the shared permalink — is a database read.
//
// That caching is not just an optimisation. The free Gemini tier allows 20
// generations a day; without it, three visitors toggling languages on one
// shared link could exhaust the quota on their own.
export async function POST(request, { params }) {
  const ip = getClientIp(request);
  const limited = rateLimit(`translate:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = body?.language;
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `language must be one of: ${SUPPORTED_LANGUAGES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const { claims } = await getCollections();
    const claim = await claims.findOne(
      { _id: new ObjectId(id) },
      { projection: { embedding: 0 } }
    );
    if (!claim) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already in that language — the original IS the translation.
    if (claim.language === language) {
      return NextResponse.json({
        language,
        claim: claim.claim || claim.text,
        explanation: claim.explanation || "",
        sourceTitles: (claim.supportingSources || []).map((s) => s.title),
        cached: true,
      });
    }

    const cached = claim.translations?.[language];
    if (cached?.claim) {
      return NextResponse.json({ ...cached, language, cached: true });
    }

    // Source titles ride along in the same call — a citation left in English
    // under an otherwise translated page is the most visible seam there is.
    const sourceTitles = (claim.supportingSources || []).map((s) => s.title);

    const translated = await translateResult({
      claim: claim.claim || claim.text,
      explanation: claim.explanation || "",
      sourceTitles,
      language,
    });

    // Cache for every future viewer of this permalink. Best-effort: a failed
    // write costs a repeat translation later, which is not worth failing the
    // request the user is waiting on.
    await claims
      .updateOne(
        { _id: claim._id },
        { $set: { [`translations.${language}`]: { ...translated, at: new Date() } } }
      )
      .catch((err) => console.error("[translate] cache write failed:", err.message));

    return NextResponse.json({ ...translated, language, cached: false });
  } catch (err) {
    console.error("[/api/claims/[id]/translate] error:", err);
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "Vitaura is temporarily unavailable. Please try again shortly."
              : `Database unavailable. ${err.hint} (See /api/health.)`,
        },
        { status: 503 }
      );
    }
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
