import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { verdictToRiskLevel } from "@/lib/gemini";

const VALID_VERDICTS = ["true", "false", "misleading", "unverified"];

// Human-in-the-loop safety net: lets an admin correct a wrong AI verdict.
export async function PATCH(request, { params }) {
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

  const verdict = body.verdict;
  const overrideNote = typeof body.overrideNote === "string" ? body.overrideNote.trim().slice(0, 1000) : "";

  if (!VALID_VERDICTS.includes(verdict)) {
    return NextResponse.json(
      { error: `verdict must be one of: ${VALID_VERDICTS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const { claims } = await getCollections();
    const riskLevel = verdictToRiskLevel(verdict);

    const result = await claims.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          verdict,
          riskLevel,
          overrideNote: overrideNote || null,
          overriddenBy: admin.email,
          overriddenAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    const updated = result?.value || result; // driver version differences
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated._id.toString(),
      verdict: updated.verdict,
      riskLevel: updated.riskLevel,
      overriddenBy: updated.overriddenBy,
      overrideNote: updated.overrideNote,
    });
  } catch (err) {
    console.error("[/api/admin/claims/[id]] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
