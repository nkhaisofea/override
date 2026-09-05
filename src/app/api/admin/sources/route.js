import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { embedText } from "@/lib/gemini";

export async function GET(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  try {
    const { sources } = await getCollections();
    const list = await sources
      .find({}, { projection: { embedding: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      list.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        text: s.text,
        url: s.url,
        createdAt: s.createdAt,
      }))
    );
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

  if (!title || !text) {
    return NextResponse.json({ error: "title and text are required" }, { status: 400 });
  }

  try {
    // Embed at save time, so the retrieval step in /api/claims/check has
    // something to compare against immediately (no separate reindex step).
    const embedding = await embedText(`${title}\n\n${text}`);

    const { sources } = await getCollections();
    const doc = {
      title,
      text,
      url: url || null,
      embedding,
      createdAt: new Date(),
      createdBy: admin.email,
    };
    const inserted = await sources.insertOne(doc);

    return NextResponse.json(
      { id: inserted.insertedId.toString(), title, text, url: doc.url, createdAt: doc.createdAt },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/admin/sources POST] error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
