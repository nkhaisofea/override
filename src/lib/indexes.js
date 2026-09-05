// Index definitions for every collection Vitaura uses.
//
// One of these is a correctness fix rather than a performance one. autoFaq.js
// deduplicates auto-generated posts with an upsert on `clusterKey`, which only
// actually prevents duplicates if the database enforces uniqueness — without
// the index, two checks crossing the threshold concurrently can both pass the
// findOne and both insert.
//
// It has to be a PARTIAL unique index: manually written FAQ posts have no
// clusterKey at all, and a plain unique index treats every one of those as the
// same null key, so the second manual post an admin writes would be rejected.

export const INDEXES = [
  {
    collection: "admins",
    spec: { email: 1 },
    options: { unique: true, name: "email_unique" },
    why: "login lookup; prevents two admin rows for the same address",
  },
  {
    collection: "claims",
    spec: { createdAt: -1 },
    options: { name: "createdAt_desc" },
    why: "auto-FAQ rolling window, 'checks today' count, claims log sort",
  },
  {
    collection: "claims",
    spec: { sessionId: 1, createdAt: -1 },
    options: { name: "session_recent" },
    why: "per-device history lookups",
  },
  {
    collection: "faq_posts",
    spec: { clusterKey: 1 },
    options: {
      unique: true,
      // Only documents where clusterKey is a string participate. Manual posts
      // (no clusterKey) are exempt rather than colliding on null.
      partialFilterExpression: { clusterKey: { $type: "string" } },
      name: "clusterKey_unique_partial",
    },
    why: "makes the auto-FAQ duplicate guard atomic under concurrency",
  },
  {
    collection: "faq_posts",
    spec: { createdAt: -1 },
    options: { name: "createdAt_desc" },
    why: "public FAQ + admin listing sort",
  },
  {
    collection: "faq_posts",
    spec: { topicTag: 1, unpublished: 1 },
    options: { name: "topic_published" },
    why: "public topic filter and the distinct() that builds the filter chips",
  },
  {
    collection: "sources",
    spec: { addedAt: -1 },
    options: { name: "addedAt_desc" },
    why: "admin sources list sort",
  },
  {
    collection: "sources",
    // Deliberately NOT unique: the seed script upserts by title, but an
    // existing database may already hold duplicates, and failing to build an
    // index is a worse outcome than tolerating them.
    spec: { title: 1 },
    options: { name: "title" },
    why: "seed script upserts by title",
  },
];

/**
 * Creates any missing indexes. Idempotent — createIndex on an index that
 * already exists with the same spec is a no-op.
 *
 * @param {import("mongodb").Db} db
 * @returns {Promise<{created: string[], failed: {index: string, error: string}[]}>}
 */
export async function ensureIndexes(db) {
  const created = [];
  const failed = [];

  for (const { collection, spec, options } of INDEXES) {
    try {
      const name = await db.collection(collection).createIndex(spec, options);
      created.push(`${collection}.${name}`);
    } catch (err) {
      // A unique index fails to build if the data already violates it (e.g.
      // duplicate admin emails). That's worth reporting, but it must not stop
      // the other indexes being built or take the app down.
      failed.push({ index: `${collection}.${options.name}`, error: err.message });
    }
  }

  return { created, failed };
}
