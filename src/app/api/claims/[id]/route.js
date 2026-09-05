import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";

export async function GET(request, { params }) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const { claims } = await getCollections();
    const claim = await claims.findOne({ _id: new ObjectId(id) });
    if (!claim) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: claim._id.toString(),
      text: claim.text,
      claim: claim.claim,
      verdict: claim.verdict,
      riskLevel: claim.riskLevel,
      explanation: claim.explanation,
      sourceCitation: claim.sourceCitation,
      language: claim.language,
      createdAt: claim.createdAt,
      overriddenBy: claim.overriddenBy,
    });
  } catch (err) {
    console.error("[/api/claims/[id]] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
