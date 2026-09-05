// Plain-array cosine similarity — no vector DB needed for a knowledge base
// this small (tens to low hundreds of sources/claims). Good enough, and one
// less service to deploy and keep alive during the demo.

/**
 * Cosine similarity between two embedding vectors, in [-1, 1].
 *
 * Returns 0 for mismatched lengths rather than throwing. That case is real:
 * changing GEMINI_EMBEDDING_DIM leaves older rows at the previous dimension,
 * and comparing across dimensions is meaningless. It's silent by design here
 * (this runs in a hot loop) — `countDimensionMismatches` below is what
 * surfaces it to an admin.
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Given a query embedding and a list of { ...doc, embedding }, return the
// top N most similar docs with their similarity score attached.
export function topMatches(queryEmbedding, docs, { limit = 3, minScore = 0 } = {}) {
  return docs
    .map((doc) => ({ ...doc, score: cosineSimilarity(queryEmbedding, doc.embedding) }))
    .filter((doc) => doc.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * How many stored docs can't be compared against the current embedding
 * dimension. Any non-zero result means those sources are invisible to
 * retrieval and need re-embedding — a failure that is otherwise completely
 * silent (every check just quietly returns "unverified").
 */
export function countDimensionMismatches(docs, expectedDim) {
  return docs.filter(
    (doc) => Array.isArray(doc.embedding) && doc.embedding.length !== expectedDim
  ).length;
}

// ---------------------------------------------------------------------------
// Auto-FAQ clustering thresholds
//
// Env-configurable so the 5-distinct-users rule can be dropped to 2 for a live
// demo (you will not have five strangers in the room) without a code change or
// rebuild. Defaults are the real production values.
// ---------------------------------------------------------------------------

function envNumber(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// How similar two claims must be to count as "the same topic". Tuned against
// gemini-embedding-001 with RETRIEVAL_QUERY on both sides: paraphrases of one
// myth land ~0.85-0.95, unrelated health claims ~0.4-0.6.
export const AUTO_FAQ_SIMILARITY_THRESHOLD = envNumber(
  "AUTO_FAQ_SIMILARITY_THRESHOLD",
  0.86
);
export const AUTO_FAQ_USER_COUNT_THRESHOLD = envNumber("AUTO_FAQ_USER_THRESHOLD", 5);
export const AUTO_FAQ_WINDOW_HOURS = envNumber("AUTO_FAQ_WINDOW_HOURS", 24);

// Given a new claim's embedding and the recent claims (already fetched from
// the rolling window), find which prior claims belong to the "same topic"
// cluster (similarity above threshold).
export function findClusterMembers(newEmbedding, recentClaims) {
  return recentClaims.filter(
    (c) => cosineSimilarity(newEmbedding, c.embedding) >= AUTO_FAQ_SIMILARITY_THRESHOLD
  );
}

/**
 * Re-attach full documents to a ranked list, preserving rank order.
 *
 * Retrieval runs in two passes: rank on embeddings only, then fetch the full
 * documents for the winners. Mongo's `$in` returns those in natural order, not
 * the order asked for — so joining them back naively silently reorders the
 * results, and `matched[0]` (used as the fallback citation when the model
 * names no source) stops being the best match. That's a wrong-source-cited
 * bug with no error attached to it, which is why this is a separate tested
 * function rather than four inline lines.
 *
 * @param {{_id: any, score: number}[]} ranked - scored, in descending order
 * @param {{_id: any}[]} docs - full documents, in arbitrary order
 * @returns {object[]} full documents in `ranked` order, each carrying `score`
 */
export function reorderByRank(ranked, docs) {
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  const out = [];
  for (const entry of ranked) {
    const doc = byId.get(String(entry._id));
    // A document can be missing if it was deleted between the two passes.
    // Dropping it is correct: citing a source that no longer exists is worse
    // than citing the next best one.
    if (doc) out.push({ ...doc, score: entry.score });
  }
  return out;
}
