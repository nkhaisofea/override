// Builds every index Vitaura relies on, and prints what exists afterwards.
//
// The app also does this lazily on first database access (see
// src/lib/mongodb.js), so this script is not strictly required — but running
// it explicitly is how you confirm the unique index on faq_posts.clusterKey
// actually built. That one is a correctness dependency, not an optimisation:
// the auto-FAQ duplicate guard is only atomic while it exists.
//
// Usage:
//   npm run db:indexes
//
// Safe to re-run.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";
import { INDEXES, ensureIndexes } from "../src/lib/indexes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "vitaura";
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log(`Building ${INDEXES.length} index(es) on "${dbName}"…\n`);
    const { created, failed } = await ensureIndexes(db);

    for (const name of created) console.log(`  ok    ${name}`);
    for (const f of failed) console.log(`  FAIL  ${f.index} — ${f.error}`);

    console.log("\nIndexes now present:");
    for (const collection of ["admins", "claims", "faq_posts", "sources"]) {
      const list = await db.collection(collection).indexes();
      console.log(`  ${collection}: ${list.map((i) => i.name).join(", ")}`);
    }

    if (failed.length) {
      console.log(
        "\nA unique index fails to build when existing data already violates it" +
          " (e.g. duplicate admin emails). Resolve the duplicates, then re-run."
      );
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Failed to build indexes:", err.message || err);
  process.exit(1);
});
