import { MongoClient } from "mongodb";
import { ensureIndexes } from "./indexes";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "vitaura";

if (!uri) {
  // Don't throw at import time — lets the app boot (and other routes work)
  // even before the DB is wired up. Anything that actually needs the DB
  // will throw a clear error when it tries to connect.
  console.warn(
    "[mongodb] MONGODB_URI is not set. Set it in .env.local to enable database features."
  );
}

let clientPromise;

// Reuse the client (and its connection pool) across hot reloads in dev,
// and across serverless invocations in the same warm instance in prod.
if (!global._vitauraMongoClientPromise) {
  const client = new MongoClient(uri || "mongodb://invalid-not-configured", {
    maxPoolSize: 10,
    minPoolSize: 1,
  });
  global._vitauraMongoClientPromise = client.connect();
}
clientPromise = global._vitauraMongoClientPromise;

export async function getDb() {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to .env.local (see README)."
    );
  }
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Builds indexes once per process, the first time the database is touched.
 *
 * Memoised on `global` for the same reason the client is: in dev this survives
 * hot reloads, and in a warm serverless instance it means one createIndex pass
 * rather than one per request. Kept as a promise (not a boolean) so concurrent
 * first requests await the same run instead of racing to build the same
 * indexes.
 *
 * Deliberately non-fatal: a unique index that can't be built because existing
 * data violates it is worth a loud warning, but must not take down the app.
 * The one that matters for correctness — faq_posts.clusterKey — only ever
 * fails if there are already duplicate auto-FAQ posts, which the seed and
 * upsert paths avoid creating.
 */
function getIndexPromise(db) {
  if (!global._vitauraIndexPromise) {
    global._vitauraIndexPromise = ensureIndexes(db)
      .then(({ created, failed }) => {
        if (failed.length) {
          console.warn(
            `[mongodb] ${failed.length} index(es) could not be built:`,
            failed.map((f) => `${f.index}: ${f.error}`).join("; ")
          );
        }
        console.log(`[mongodb] ${created.length} index(es) ensured.`);
      })
      .catch((err) => {
        console.warn("[mongodb] index setup failed:", err.message);
      });
  }
  return global._vitauraIndexPromise;
}

export async function getCollections() {
  const db = await getDb();
  await getIndexPromise(db);
  return {
    claims: db.collection("claims"),
    sources: db.collection("sources"),
    faqPosts: db.collection("faq_posts"),
    admins: db.collection("admins"),
  };
}
