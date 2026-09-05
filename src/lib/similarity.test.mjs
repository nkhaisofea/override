// Run with: npm test
//
// Retrieval is the part of Vitaura that fails silently. A wrong similarity
// result doesn't throw — it just hands the model the wrong source text, or no
// source at all, and the user sees a confident "unverified" with no hint that
// anything went wrong. These tests cover the failure modes that produce no
// error message.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  topMatches,
  reorderByRank,
  countDimensionMismatches,
  findClusterMembers,
  evaluateAutoFaqTrigger,
  AUTO_FAQ_SIMILARITY_THRESHOLD,
  AUTO_FAQ_SHARE_THRESHOLD,
} from "./similarity.js";

test("cosine similarity basics", () => {
  assert.equal(Math.round(cosineSimilarity([1, 2, 3], [1, 2, 3]) * 1e6) / 1e6, 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(Math.round(cosineSimilarity([1, 0], [-1, 0]) * 1e6) / 1e6, -1);
  // Magnitude must not matter — only direction.
  assert.equal(
    Math.round(cosineSimilarity([1, 2], [10, 20]) * 1e6) / 1e6,
    1
  );
});

test("mismatched dimensions score 0 rather than throwing", () => {
  // This is the symptom of changing GEMINI_EMBEDDING_DIM without re-embedding.
  // It has to be non-fatal (it runs in a hot loop over every source) which is
  // exactly why countDimensionMismatches exists to surface it separately.
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2]), 0);
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity(null, [1]), 0);
  assert.equal(cosineSimilarity([1], undefined), 0);
});

test("zero vectors don't produce NaN", () => {
  // Division by a zero norm would yield NaN, which sorts unpredictably and
  // would poison the ranking rather than simply losing.
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
});

test("countDimensionMismatches finds exactly the unretrievable sources", () => {
  const docs = [
    { embedding: [1, 2, 3] },
    { embedding: [1, 2] }, // stale dimension
    { embedding: null }, // never embedded — counted separately by the route
    { embedding: [4, 5, 6] },
  ];
  assert.equal(countDimensionMismatches(docs, 3), 1);
});

test("topMatches sorts by score descending and honours the limit", () => {
  const docs = [
    { id: "far", embedding: [0, 1] },
    { id: "exact", embedding: [1, 0] },
    { id: "near", embedding: [0.9, 0.1] },
  ];
  const out = topMatches([1, 0], docs, { limit: 2, minScore: 0 });
  assert.deepEqual(
    out.map((d) => d.id),
    ["exact", "near"]
  );
  assert.ok(out[0].score > out[1].score);
});

test("topMatches drops anything below minScore", () => {
  const docs = [
    { id: "relevant", embedding: [1, 0] },
    { id: "unrelated", embedding: [0, 1] },
  ];
  // Nothing relevant => empty, which is what makes the model answer
  // "unverified" instead of grounding on an unrelated source.
  assert.deepEqual(topMatches([1, 0], docs, { minScore: 0.55 }).map((d) => d.id), [
    "relevant",
  ]);
  assert.deepEqual(topMatches([0.1, 0.99], docs, { minScore: 0.999 }), []);
});

test("reorderByRank restores rank order regardless of how Mongo returned it", () => {
  // The actual hazard: $in returns natural order, so the best match can come
  // back second. matched[0] is used as the fallback citation.
  const ranked = [
    { _id: "c", score: 0.9 },
    { _id: "a", score: 0.7 },
    { _id: "b", score: 0.6 },
  ];
  const docs = [
    { _id: "a", title: "A" },
    { _id: "b", title: "B" },
    { _id: "c", title: "C" },
  ];
  const out = reorderByRank(ranked, docs);
  assert.deepEqual(out.map((d) => d.title), ["C", "A", "B"]);
  assert.deepEqual(out.map((d) => d.score), [0.9, 0.7, 0.6]);
});

test("reorderByRank matches ObjectId-like ids by string value", () => {
  // Real _ids are ObjectIds; two instances of the same id are not ===.
  const oid = (hex) => ({ toString: () => hex });
  const out = reorderByRank(
    [{ _id: oid("abc"), score: 0.8 }],
    [{ _id: oid("abc"), title: "Matched" }]
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Matched");
});

test("reorderByRank drops a source deleted between the two passes", () => {
  const out = reorderByRank(
    [
      { _id: "gone", score: 0.9 },
      { _id: "here", score: 0.8 },
    ],
    [{ _id: "here", title: "Here" }]
  );
  assert.deepEqual(out.map((d) => d.title), ["Here"]);
});

test("findClusterMembers groups only claims above the similarity threshold", () => {
  assert.ok(AUTO_FAQ_SIMILARITY_THRESHOLD > 0.5 && AUTO_FAQ_SIMILARITY_THRESHOLD < 1);
  const recent = [
    { _id: 1, embedding: [1, 0] }, // identical -> 1.0
    { _id: 2, embedding: [0, 1] }, // orthogonal -> 0
  ];
  const members = findClusterMembers([1, 0], recent);
  assert.deepEqual(members.map((m) => m._id), [1]);
});

// --- Auto-FAQ trigger -------------------------------------------------------
// The rule as specified: publish when a topic is >=50% of everyone who used the
// app in the window, AND at least 5 distinct people asked. The share is the
// signal; the floor is what stops a sample of one from publishing a public
// health FAQ.

test("the worked example from the spec: 5 of 10 publishes", () => {
  const t = evaluateAutoFaqTrigger(5, 10);
  assert.equal(t.publish, true);
  assert.equal(t.share, 0.5);
  assert.match(t.reason, /5 of 10/);
});

test("share alone cannot publish — the floor blocks small samples", () => {
  // 100% share, but only two people have used the app at all.
  const t = evaluateAutoFaqTrigger(2, 2);
  assert.equal(t.publish, false);
  assert.equal(t.share, 1);
  assert.match(t.reason, /need 5/);

  // The pathological case: the very first user is 100% of all users.
  assert.equal(evaluateAutoFaqTrigger(1, 1).publish, false);
});

test("headcount alone cannot publish — it must also be a majority", () => {
  // 6 people asked about it, but 30 people asked about other things.
  const t = evaluateAutoFaqTrigger(6, 30);
  assert.equal(t.publish, false);
  assert.equal(t.share, 0.2);
  assert.match(t.reason, /20%/);
});

test("exactly at both thresholds publishes (boundaries are inclusive)", () => {
  assert.equal(evaluateAutoFaqTrigger(5, 10).publish, true); // exactly 50%, exactly 5
});

test("just under either threshold does not publish", () => {
  assert.equal(evaluateAutoFaqTrigger(4, 8).publish, false); // 50% but only 4 people
  assert.equal(evaluateAutoFaqTrigger(5, 11).publish, false); // 5 people but 45.5%
});

test("share threshold is a sane fraction, not a percentage", () => {
  // Guards against someone setting AUTO_FAQ_SHARE_THRESHOLD=50 meaning "50%",
  // which would make the rule impossible to satisfy.
  assert.ok(AUTO_FAQ_SHARE_THRESHOLD > 0 && AUTO_FAQ_SHARE_THRESHOLD <= 1);
});

test("a zero denominator cannot divide by zero or publish", () => {
  const t = evaluateAutoFaqTrigger(0, 0);
  assert.equal(t.share, 0);
  assert.equal(t.publish, false);
  assert.ok(Number.isFinite(t.share));
});

test("every outcome carries a human-readable reason", () => {
  for (const [c, n] of [[5, 10], [2, 2], [6, 30], [0, 0], [1, 1]]) {
    const t = evaluateAutoFaqTrigger(c, n);
    assert.ok(t.reason && t.reason.length > 5, `no reason for ${c}/${n}`);
  }
});
