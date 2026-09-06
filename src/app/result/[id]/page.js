import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/mongodb";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";
import ResultView from "@/components/ResultView";

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

  // Serialise for the client boundary: ObjectId and Date are not
  // structured-cloneable, so they have to become strings here rather than
  // failing at render time. `translations` is deliberately dropped — the
  // client fetches the one language it needs on demand instead of shipping
  // every cached translation to every visitor.
  const view = {
    id: claim._id.toString(),
    text: claim.text || "",
    claim: claim.claim || claim.text || "",
    explanation: claim.explanation || "",
    verdict: claim.verdict || "unverified",
    riskLevel: claim.riskLevel || "caution",
    evidenceConfidence: claim.evidenceConfidence ?? null,
    actionRisk: claim.actionRisk ?? null,
    language: claim.language || "en",
    // Only a definitive verdict carries its evidence to the client.
    //
    // Enforced here rather than only in the view: props to a client component
    // are serialised into the page payload, so filtering in the UI alone would
    // still ship the citations in the HTML for an "unverified" or "misleading"
    // result. Withholding them at this boundary means they are genuinely
    // absent, not merely unrendered. They remain on the claim document for the
    // admin claims log.
    ...(claim.verdict === "true" || claim.verdict === "false"
      ? {
          sourceCitation: claim.sourceCitation
            ? { title: claim.sourceCitation.title, url: claim.sourceCitation.url || null }
            : null,
          supportingSources: (claim.supportingSources || []).map((s) => ({
            title: s.title,
            url: s.url || null,
            score: s.score ?? null,
            citedByModel: !!s.citedByModel,
          })),
        }
      : { sourceCitation: null, supportingSources: [] }),
    overriddenBy: claim.overriddenBy || null,
    overrideNote: claim.overrideNote || null,
  };

  return <ResultView claim={view} />;
}
