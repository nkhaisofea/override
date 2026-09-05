import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { embedDocument, EMBEDDING_DIMENSION, GeminiError } from "@/lib/gemini";
import { countDimensionMismatches } from "@/lib/similarity";
import { normalizeTags } from "@/lib/tags";


export async function GET(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  try {
    const { sources } = await getCollections();
    // Embeddings are pulled only to count dimension mismatches, then dropped —
    // they're ~768 floats each and have no business crossing the wire.
    const list = await sources.find({}).sort({ addedAt: -1, createdAt: -1 }).toArray();

    const staleCount = countDimensionMismatches(list, EMBEDDING_DIMENSION);
    const missingCount = list.filter((s) => !Array.isArray(s.embedding)).length;

    return NextResponse.json({
      // A source whose embedding is missing or the wrong dimension is
      // invisible to retrieval — every check just quietly returns
      // "unverified". Surfaced here so it's fixable instead of mysterious.
      needsReembed: staleCount + missingCount,
      embeddingDimension: EMBEDDING_DIMENSION,
      sources: list.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        text: s.text,
        url: s.url,
        topicTags: s.topicTags || [],
        addedAt: s.addedAt || s.createdAt || null,
        embedded:
          Array.isArray(s.embedding) && s.embedding.length === EMBEDDING_DIMENSION,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/sources GET] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const topicTags = normalizeTags(body.topicTags);

  if (!title || !text) {
    return NextResponse.json({ error: "title and text are required" }, { status: 400 });
  }

  try {
    // Embed at save time, so the retrieval step in /api/claims/check has
    // something to compare against immediately (no separate reindex step).
    // RETRIEVAL_DOCUMENT, not the query task type — see lib/gemini.js.
    const embedding = await embedDocument(`${title}\n\n${text}`);

    const { sources } = await getCollections();
    const doc = {
      title,
      text,
      url: url || null,
      topicTags,
      embedding,
      addedAt: new Date(),
      createdBy: admin.email,
    };
    const inserted = await sources.insertOne(doc);

    return NextResponse.json(
      {
        id: inserted.insertedId.toString(),
        title,
        text,
        url: doc.url,
        topicTags,
        addedAt: doc.addedAt,
        embedded: true,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/admin/sources POST] error:", err);
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
