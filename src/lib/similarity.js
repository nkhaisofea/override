// Plain-array cosine similarity — no vector DB needed for a knowledge base
// this small (tens to low hundreds of sources/claims). Good enough, and one
// less service to deploy and keep alive during the demo.

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

// Auto-FAQ clustering threshold config
export const AUTO_FAQ_SIMILARITY_THRESHOLD = 0.86;
export const AUTO_FAQ_USER_COUNT_THRESHOLD = 5;
export const AUTO_FAQ_WINDOW_HOURS = 24;

// Given a new claim's embedding and the recent claims (already fetched from
// the rolling window), find which prior claims belong to the "same topic"
// cluster (similarity above threshold), and return the distinct set
// including the new one.
export function findClusterMembers(newEmbedding, recentClaims) {
  return recentClaims.filter(
    (c) => cosineSimilarity(newEmbedding, c.embedding) >= AUTO_FAQ_SIMILARITY_THRESHOLD
  );
}
