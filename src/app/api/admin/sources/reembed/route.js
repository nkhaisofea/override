import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { embedDocument, EMBEDDING_DIMENSION, GeminiError } from "@/lib/gemini";

// Re-embeds sources whose vector is missing or the wrong dimension.
//
// This exists because that failure is completely silent otherwise: a source
// with a stale-dimension embedding scores 0 against every query, so it simply
// stops being retrievable, and the only symptom is that checks start coming
// back "unverified" for topics you know are covered. Changing
// GEMINI_EMBEDDING_DIM is the usual cause.
//
// Pass { all: true } to force a full re-embed (e.g. after switching embedding
// model), otherwise only the broken ones are touched.
export async function POST(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — defaults to repairing only what's broken.
  }
  const forceAll = body?.all === true;

  try {
    const { sources } = await getCollections();
    const all = await sources.find({}, { projection: { title: 1, text: 1, embedding: 1 } }).toArray();

    const stale = all.filter(
      (s) =>
        forceAll ||
        !Array.isArray(s.embedding) ||
        s.embedding.length !== EMBEDDING_DIMENSION
    );

    let repaired = 0;
    const failures = [];

    // Sequential, not Promise.all: the free Gemini tier rate-limits hard, and
    // firing 200 embed calls at once is the reliable way to get every one of
    // them 429'd.
    for (const source of stale) {
      try {
        const embedding = await embedDocument(`${source.title}\n\n${source.text}`);
        await sources.updateOne(
          { _id: source._id },
          { $set: { embedding, reembeddedAt: new Date() } }
        );
        repaired++;
      } catch (err) {
        failures.push({ id: source._id.toString(), title: source.title });
        console.error(`[reembed] failed for ${source._id}:`, err.message);
        // A rate limit will hit every remaining source too — stop rather than
        // grinding through 200 guaranteed failures.
        if (err instanceof GeminiError && err.status === 429) break;
      }
    }

    return NextResponse.json({
      checked: all.length,
      needed: stale.length,
      repaired,
      failed: failures.length,
      failures: failures.slice(0, 10),
      embeddingDimension: EMBEDDING_DIMENSION,
    });
  } catch (err) {
    console.error("[/api/admin/sources/reembed] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
