import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200);

  try {
    const { claims } = await getCollections();
    const list = await claims
      .find({}, { projection: { embedding: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(
      list.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        claim: c.claim,
        language: c.language,
        verdict: c.verdict,
        riskLevel: c.riskLevel,
        explanation: c.explanation,
        sourceCitation: c.sourceCitation,
        overriddenBy: c.overriddenBy,
        overrideNote: c.overrideNote,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    console.error("[/api/admin/claims] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
