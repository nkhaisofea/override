import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";
import { VerdictBadge, RISK_CONFIG } from "@/components/StatusBadge";
import { ScoreMeter } from "@/components/ScoreMeter";

async function getClaim(id) {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { claims } = await getCollections();
    return await claims.findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error("[result page] failed to load claim:", err);
    return null;
  }
}

export default async function ResultPage({ params }) {
  const { id } = await params;
  const claim = await getClaim(id);

  if (!claim) {
    return (
      <main className="mx-auto max-w-md px-5 pt-8 pb-16">
        <Logo className="mb-8" />
        <Card>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            This result couldn&apos;t be found — it may not exist, or the database
            isn&apos;t connected yet.
          </p>
        </Card>
        <Link href="/" className="inline-block mt-4">
          <PillButton variant="outline">Back to Vitaura</PillButton>
        </Link>
      </main>
    );
  }

  const riskCfg = RISK_CONFIG[claim.riskLevel] || RISK_CONFIG.caution;

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-16">
      <Logo className="mb-8" />

      <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
        Claim checked
      </p>
      <Card raised className="mb-4">
        <p className="text-base leading-snug mb-4">{claim.claim || claim.text}</p>
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={claim.verdict} size="lg" />
          <span
            className="label-tracked text-xs"
            style={{ color: riskCfg.color }}
          >
            {riskCfg.label}
          </span>
        </div>
        {claim.overriddenBy && (
          <p className="text-[11px] mt-3" style={{ color: "var(--muted)" }}>
            This verdict was reviewed and corrected by our fact-checking team.
          </p>
        )}
      </Card>

      {(claim.evidenceConfidence != null || claim.actionRisk != null) && (
        <Card className="mb-4 flex flex-col gap-4">
          <ScoreMeter
            label="Evidence confidence"
            value={claim.evidenceConfidence}
            color="var(--accent)"
            description="How strongly our trusted sources support this claim being true."
          />
          <ScoreMeter
            label="Action risk"
            value={claim.actionRisk}
            color="var(--danger)"
            description="How dangerous it would be to act on this claim if it's wrong."
          />
        </Card>
      )}

      <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
        Why
      </p>
      <Card className="mb-4">
        <p className="text-sm leading-relaxed">{claim.explanation}</p>
      </Card>

      {claim.sourceCitation && (
        <>
          <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
            Source
          </p>
          <a href={claim.sourceCitation.url} target="_blank" rel="noreferrer">
            <Card className="mb-4 flex items-center justify-between">
              <span className="text-sm">{claim.sourceCitation.title}</span>
              <span style={{ color: "var(--accent)" }}>↗</span>
            </Card>
          </a>
        </>
      )}

      <Link href="/">
        <PillButton className="w-full">Check another message</PillButton>
      </Link>
    </main>
  );
}
