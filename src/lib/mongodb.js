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

/** Thrown when the database is unreachable, as opposed to a query failing. */
export class DatabaseUnavailableError extends Error {
  constructor(message, { cause, hint } = {}) {
    super(message);
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
    this.hint = hint;
  }
}

// Turns MongoDB's driver errors into something a human can act on. These two
// failures look nothing alike in the logs but are the only ones that actually
// happen during setup, and neither error message says what to do about it.
function explainConnectionError(err) {
  const msg = String(err?.message || err);

  if (/tlsv1 alert internal error|SSL alert number 80/i.test(msg)) {
    return (
      "Atlas rejected the TLS handshake. The cluster is most likely PAUSED or deleted " +
      "(Atlas → Database → Resume), or your IP is not on the Network Access allow list."
    );
  }
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(msg)) {
    return "The cluster hostname didn't resolve. Check MONGODB_URI for typos, or check DNS.";
  }
  if (/Authentication failed|bad auth/i.test(msg)) {
    return "The username or password in MONGODB_URI is wrong. Note that a password with @ : / ? # must be percent-encoded.";
  }
  if (/timed out|ETIMEDOUT|serverSelectionTimeout/i.test(msg)) {
    return "Couldn't reach the cluster in time — usually the Network Access allow list, or a firewall blocking port 27017.";
  }
  return "Check MONGODB_URI, and that the Atlas cluster is running and allows your IP.";
}

/**
 * Connect, caching the client across hot reloads and warm serverless
 * invocations so the pool is reused.
 *
 * The important detail is the `.catch` that clears the cached promise. A
 * rejected promise stored on `global` is permanent: `global` survives Fast
 * Refresh, so caching a failed connect meant that once the database was
 * unreachable at startup, every later request reused that same rejection —
 * and fixing Atlas appeared to change nothing until the dev server was fully
 * restarted. Clearing it makes the next request genuinely retry.
 */
function getClientPromise() {
  if (!global._vitauraMongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      // Fail fast rather than hanging a request for 30s while the driver
      // keeps hunting for a reachable node.
      serverSelectionTimeoutMS: 10_000,
    });

    global._vitauraMongoClientPromise = client.connect().catch((err) => {
      global._vitauraMongoClientPromise = null; // let the next call retry
      console.error(`[mongodb] connection failed: ${err.message}`);
      console.error(`[mongodb] ${explainConnectionError(err)}`);
      throw new DatabaseUnavailableError("Could not connect to MongoDB", {
        cause: err,
        hint: explainConnectionError(err),
      });
    });
  }
  return global._vitauraMongoClientPromise;
}

export async function getDb() {
  if (!uri) {
    throw new DatabaseUnavailableError("MONGODB_URI is not configured", {
      hint: "Add MONGODB_URI to .env.local (see .env.local.example).",
    });
  }
  const client = await getClientPromise();
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
        // Same reasoning as the client promise: don't cache a rejection.
        global._vitauraIndexPromise = null;
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

/**
 * Connectivity probe for /api/health. Never throws — it reports.
 */
export async function checkDatabaseHealth() {
  if (!uri) {
    return { ok: false, error: "MONGODB_URI is not set", hint: "Add it to .env.local." };
  }
  try {
    const db = await getDb();
    const started = Date.now();
    await db.command({ ping: 1 });
    return { ok: true, database: dbName, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: err?.cause?.message || err.message,
      hint: err.hint || explainConnectionError(err),
    };
  }
}
