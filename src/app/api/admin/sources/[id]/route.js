import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { embedText } from "@/lib/gemini";

export async function PUT(request, { params }) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!title || !text) {
    return NextResponse.json({ error: "title and text are required" }, { status: 400 });
  }

  try {
    // Re-embed on edit, since the content used for retrieval has changed.
    const embedding = await embedText(`${title}\n\n${text}`);

    const { sources } = await getCollections();
    const result = await sources.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { title, text, url: url || null, embedding, updatedAt: new Date(), updatedBy: admin.email } },
      { returnDocument: "after" }
    );

    const updated = result?.value || result;
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated._id.toString(),
      title: updated.title,
      text: updated.text,
      url: updated.url,
    });
  } catch (err) {
    console.error("[/api/admin/sources/[id] PUT] error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const { sources } = await getCollections();
    const result = await sources.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/sources/[id] DELETE] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
