import { MongoClient } from "mongodb";

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

export async function getCollections() {
  const db = await getDb();
  return {
    claims: db.collection("claims"),
    sources: db.collection("sources"),
    faqPosts: db.collection("faq_posts"),
    admins: db.collection("admins"),
  };
}
