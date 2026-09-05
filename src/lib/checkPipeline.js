import { getCollections } from "./mongodb";
import { embedQuery, checkClaim } from "./gemini";
import { topMatches, reorderByRank } from "./similarity";
import { deriveRiskLevel } from "./risk";
import { maybeCreateAutoFaq } from "./autoFaq";

// Minimum cosine similarity for a source to be considered relevant enough to
// put in front of the model. Set too low and the model gets handed unrelated
// source text and grounds a verdict in it; too high and everything comes back
// "unverified". Kept as a named constant so it's tunable in one place.
const RETRIEVAL_MIN_SCORE = 0.55;
const RETRIEVAL_LIMIT = 3;

// The core verify pipeline, shared by the paste-text flow (/api/claims/check)
// and the Reality Scan flow (/api/claims/check-image) — both end up with a
// claim string in hand and take it through the identical embed -> retrieve
// trusted sources -> grounded verdict -> save -> auto-FAQ steps, so there's
// exactly one place that logic lives.
export async function runCheckPipeline({ text, language, sessionId, inputType = "paste" }) {
  const { claims, sources } = await getCollections();

  // 1. Embed the incoming message as a QUERY (sources are embedded as
  //    documents — see lib/gemini.js for why the asymmetry matters).
  const embedding = await embedQuery(text);

  // 2. Retrieve the most relevant trusted sources (manual cosine similarity
  //    over a small collection — no vector DB needed at this scale).
  //
  //    Done in two passes. Scoring only needs the vectors, so the first pass
  //    deliberately excludes `text` — source bodies are the largest field by
  //    far, and pulling every one of them on every check just to discard all
  //    but three is the one genuinely wasteful thing in the hot path. The
  //    second pass fetches full documents for the handful that survived.
  const candidates = await sources
    .find({}, { projection: { _id: 1, title: 1, embedding: 1 } })
    .toArray();

  const ranked = topMatches(embedding, candidates, {
    limit: RETRIEVAL_LIMIT,
    minScore: RETRIEVAL_MIN_SCORE,
  });

  let matched = [];
  if (ranked.length) {
    const full = await sources
      .find(
        { _id: { $in: ranked.map((r) => r._id) } },
        { projection: { title: 1, text: 1, url: 1, topicTags: 1 } }
      )
      .toArray();

    // $in returns natural order, not the order asked for, and matched[0] is
    // relied on below as the best match. See reorderByRank.
    matched = reorderByRank(ranked, full);
  }

  // 3. Ask Gemini for a grounded verdict.
  const result = await checkClaim({
    rawMessage: text,
    language,
    sources: matched.map((m) => ({ title: m.title, text: m.text, url: m.url })),
  });

  // 4. Blend the categorical verdict with the model's independent action-risk
  //    score — see lib/risk.js for why verdict alone is the wrong signal.
  const riskLevel = deriveRiskLevel(result.verdict, result.actionRisk);

  // Which source to show under the verdict.
  //
  // If the model named one, use it. If it named none, fall back to the best
  // retrieved match — EXCEPT when the verdict is "unverified", which means the
  // model looked at the retrieved text and concluded it doesn't cover this
  // claim. Attaching a citation there actively misleads: retrieval casts a
  // wide net, so an unrelated source can clear the similarity floor, and the
  // result page would show "Source: WHO — Detox diets and cleanses" beneath a
  // question about protein shakes. A fact-checker citing a source that doesn't
  // support anything is worse than showing no source at all.
  const citedByModel = matched.find((m) => m.title === result.citedSourceTitle);
  const topSource =
    citedByModel || (result.verdict === "unverified" ? null : matched[0]) || null;
  const sourceCitation = topSource
    ? { title: topSource.title, url: topSource.url }
    : null;

  // 5. Save the check.
  const claimDoc = {
    text,
    language,
    inputType,
    verdict: result.verdict,
    riskLevel,
    evidenceConfidence: result.evidenceConfidence,
    actionRisk: result.actionRisk,
    explanation: result.explanation,
    claim: result.claim,
    sourceId: topSource?._id || null,
    sourceCitation,
    // Carried onto the claim so auto-generated FAQ posts inherit a real topic
    // tag instead of falling back to the cited source's title.
    topicTags: topSource?.topicTags || [],
    retrievalScore: topSource?.score ?? null,
    embedding,
    sessionId,
    createdAt: new Date(),
    overriddenBy: null,
    overrideNote: null,
  };
  const inserted = await claims.insertOne(claimDoc);

  // 6. Auto-FAQ clustering check — best-effort, never blocks the response.
  maybeCreateAutoFaq({ newClaimDoc: { _id: inserted.insertedId, ...claimDoc } }).catch(
    () => {}
  );

  return {
    id: inserted.insertedId.toString(),
    claim: result.claim,
    verdict: result.verdict,
    riskLevel,
    evidenceConfidence: result.evidenceConfidence,
    actionRisk: result.actionRisk,
    explanation: result.explanation,
    sourceCitation,
    language,
  };
}
