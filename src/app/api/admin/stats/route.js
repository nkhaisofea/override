import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;

  try {
    const { claims, sources } = await getCollections();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalAllTime, totalToday, verdictBreakdownAgg, activeSourceCount, recent] =
      await Promise.all([
        claims.countDocuments({}),
        claims.countDocuments({ createdAt: { $gte: startOfToday } }),
        claims
          .aggregate([{ $group: { _id: "$verdict", count: { $sum: 1 } } }])
          .toArray(),
        sources.countDocuments({}),
        claims
          .find({}, { projection: { text: 1, verdict: 1, language: 1, createdAt: 1 } })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray(),
      ]);

    const verdictBreakdown = { true: 0, false: 0, misleading: 0, unverified: 0 };
    for (const row of verdictBreakdownAgg) {
      if (verdictBreakdown[row._id] !== undefined) verdictBreakdown[row._id] = row.count;
    }

    return NextResponse.json({
      totalToday,
      totalAllTime,
      verdictBreakdown,
      activeSourceCount,
      recentInteractions: recent.map((r) => ({
        id: r._id.toString(),
        text: r.text,
        verdict: r.verdict,
        language: r.language,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/stats] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
