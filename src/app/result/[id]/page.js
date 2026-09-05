import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { Logo } from "@/components/Logo";
import { Card, PillButton, SectionLabel } from "@/components/Card";
import { VerdictBadge, RiskBadge, RISK_CONFIG } from "@/components/StatusBadge";
import { ScoreMeter } from "@/components/ScoreMeter";
import { riskRationale } from "@/lib/risk";
import ShareButton from "@/components/ShareButton";

async function getClaim(id) {
  if (!ObjectId.isValid(id)) return null;
  try {
    const { claims } = await getCollections();
    return await claims.findOne(
      { _id: new ObjectId(id) },
      // The embedding is ~768 floats and is never rendered — leaving it out
      // keeps the server component's payload small.
      { projection: { embedding: 0 } }
    );
  } catch (err) {
    console.error("[result page] failed to load claim:", err);
    return null;
  }
}

// Every check gets a shareable permalink, so the title is the claim itself —
// that's what shows in a WhatsApp link preview when someone forwards the
// verdict back into the group chat the myth came from.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const claim = await getClaim(id);
  if (!claim) return { title: "Result not found" };

  const verdict = (claim.verdict || "unverified").toUpperCase();
  return {
    title: `${verdict}: ${(claim.claim || claim.text || "").slice(0, 80)}`,
    description: claim.explanation?.slice(0, 200),
    openGraph: {
      title: `${verdict} — checked by Vitaura`,
      description: claim.explanation?.slice(0, 200),
    },
  };
}

export default async function ResultPage({ params }) {
  const { id } = await params;
  const claim = await getClaim(id);

  // A malformed id is a 404, but a real id that isn't in the database is
  // usually "Mongo isn't wired up yet" during setup — worth distinguishing,
  // because a bare 404 sends you looking in the wrong place.
  if (!claim) {
    if (!ObjectId.isValid(id)) notFound();
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-xl sm:px-8">
        <Logo href="/" className="mb-8" />
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            This result couldn&apos;t be found — it may have expired, or the database
            isn&apos;t connected yet.
          </p>
        </Card>
        <Link href="/" className="mt-4 inline-block">
          <PillButton variant="outline">Back to Vitaura</PillButton>
        </Link>
      </main>
    );
  }

  const riskCfg = RISK_CONFIG[claim.riskLevel] || RISK_CONFIG.caution;
  const rationale = riskRationale(claim.verdict, claim.actionRisk, claim.riskLevel);
  const claimText = claim.claim || claim.text;

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-xl sm:px-8 lg:max-w-4xl lg:pt-12">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/" />
        <ShareButton title={`${(claim.verdict || "").toUpperCase()}: ${claimText}`} />
      </header>

      {/* The verdict card leads, with a left border in the risk colour so the
          state is readable before a single word is. */}
      <SectionLabel className="mb-2">Claim checked</SectionLabel>
      <Card
        raised
        className={`mb-4 border-l-4 ${riskCfg.border} lg:p-7`}
      >
        <p className="mb-4 text-base leading-snug sm:text-lg lg:text-xl">{claimText}</p>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={claim.verdict} size="lg" />
          <RiskBadge riskLevel={claim.riskLevel} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{rationale}</p>
        {claim.overriddenBy && (
          <p className="mt-3 rounded-xl bg-accent-softer px-3 py-2 text-[11px] leading-relaxed text-accent">
            This verdict was reviewed and corrected by our fact-checking team.
            {claim.overrideNote ? ` ${claim.overrideNote}` : ""}
          </p>
        )}
      </Card>

      {/* From lg the explanation and the two meters sit side by side rather
          than stacking into a long scroll. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div>
          <SectionLabel className="mb-2">Why</SectionLabel>
          <Card className="mb-4 lg:mb-0">
            <p className="text-sm leading-relaxed">{claim.explanation}</p>
          </Card>
        </div>

        {(claim.evidenceConfidence != null || claim.actionRisk != null) && (
          <div>
            <SectionLabel className="mb-2">Two-axis read</SectionLabel>
            <Card className="mb-4 flex flex-col gap-4 lg:mb-0">
              <ScoreMeter
                label="Evidence confidence"
                value={claim.evidenceConfidence}
                tone="accent"
                description="How strongly our trusted sources support this claim being true."
              />
              <ScoreMeter
                label="Action risk"
                value={claim.actionRisk}
                tone="danger"
                description="How dangerous it would be to act on this claim if it's wrong."
              />
            </Card>
          </div>
        )}
      </div>

      {claim.sourceCitation && (
        <div className="mt-4">
          <SectionLabel className="mb-2">Source</SectionLabel>
          <a
            href={claim.sourceCitation.url || "#"}
            target="_blank"
            rel="noreferrer"
            className="block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Card className="flex items-center justify-between gap-3 transition-colors hover:border-accent">
              <span className="min-w-0 flex-1 text-sm">{claim.sourceCitation.title}</span>
              <span className="shrink-0 text-accent" aria-hidden="true">
                ↗
              </span>
            </Card>
          </a>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="flex-1">
          <PillButton className="w-full">Check another message</PillButton>
        </Link>
        <Link href="/faq" className="flex-1">
          <PillButton variant="outline" className="w-full">
            Browse health FAQs
          </PillButton>
        </Link>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-faint">
        Not medical advice. For anything about your own health, talk to a clinician.
      </p>
    </main>
  );
}
