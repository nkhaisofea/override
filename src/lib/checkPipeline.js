import { getCollections } from "./mongodb";
import { embedText, checkClaim, verdictToRiskLevel } from "./gemini";
import { topMatches } from "./similarity";
import { maybeCreateAutoFaq } from "./autoFaq";

// The core verify pipeline, shared by the paste-text flow (/api/claims/check)
// and the Reality Scan flow (/api/claims/check-image) — both end up with a
// claim string in hand and take it through the identical embed -> retrieve
// trusted sources -> grounded verdict -> save -> auto-FAQ steps, so there's
// exactly one place that logic lives.
export async function runCheckPipeline({ text, language, sessionId, inputType = "paste" }) {
  const { claims, sources } = await getCollections();

  // 1. Embed the incoming message.
  const embedding = await embedText(text);

  // 2. Retrieve the most relevant trusted sources (manual cosine similarity
  //    over a small collection — no vector DB needed at this scale).
  const allSources = await sources
    .find({}, { projection: { title: 1, text: 1, url: 1, embedding: 1 } })
    .toArray();
  const matched = topMatches(embedding, allSources, { limit: 3, minScore: 0.55 });

  // 3. Ask Gemini for a grounded verdict.
  const result = await checkClaim({
    rawMessage: text,
    language,
    sources: matched.map((m) => ({ title: m.title, text: m.text, url: m.url })),
  });

  const riskLevel = verdictToRiskLevel(result.verdict);
  const topSource = matched.find((m) => m.title === result.citedSourceTitle) || matched[0] || null;
  const sourceCitation = topSource ? { title: topSource.title, url: topSource.url } : null;

  // 4. Save the check.
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
    embedding,
    sessionId,
    createdAt: new Date(),
    overriddenBy: null,
    overrideNote: null,
  };
  const inserted = await claims.insertOne(claimDoc);

  // 5. Auto-FAQ clustering check — best-effort, never blocks the response.
  maybeCreateAutoFaq({ newClaimDoc: { _id: inserted.insertedId, ...claimDoc } }).catch(() => {});

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
