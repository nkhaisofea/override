// Embeds any source whose vector is missing or built at a different dimension.
//
// The same repair the admin UI offers as "Re-embed all", available from the
// command line so seeding and embedding can be done in one go without logging
// in. Sources land unembedded from `npm run seed:sources`, and an unembedded
// source is invisible to retrieval — every check silently returns "unverified".
//
// Usage:
//   npm run embed:sources           # embed only what's missing or stale
//   npm run embed:sources -- --all  # force re-embed everything

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local first.");
    process.exit(1);
  }

  // Imported after env is loaded — the module reads config at import time.
  const { embedDocument, EMBEDDING_DIMENSION } = await import("../src/lib/gemini.js");

  const forceAll = process.argv.includes("--all");
  const client = new MongoClient(uri, { maxPoolSize: 10 });

  try {
    await client.connect();
    const sources = client
      .db(process.env.MONGODB_DB || "vitaura")
      .collection("sources");

    const all = await sources
      .find({}, { projection: { title: 1, text: 1, embedding: 1 } })
      .toArray();

    const todo = all.filter(
      (s) =>
        forceAll ||
        !Array.isArray(s.embedding) ||
        s.embedding.length !== EMBEDDING_DIMENSION
    );

    console.log(
      `${all.length} source(s) total; ${todo.length} need embedding at ${EMBEDDING_DIMENSION} dimensions.\n`
    );
    if (todo.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    let ok = 0;
    let failed = 0;
    // Sequential on purpose: the free tier rate-limits, and firing 20 embed
    // calls at once is the reliable way to get all of them throttled.
    for (const source of todo) {
      try {
        const embedding = await embedDocument(`${source.title}\n\n${source.text}`);
        await sources.updateOne(
          { _id: source._id },
          { $set: { embedding, reembeddedAt: new Date() } }
        );
        console.log(`  ok    ${source.title.slice(0, 56)}`);
        ok++;
      } catch (err) {
        console.log(`  FAIL  ${source.title.slice(0, 56)} — ${err.message.slice(0, 60)}`);
        failed++;
        // A rate limit will hit every remaining source too; stop rather than
        // grinding through guaranteed failures.
        if (err?.status === 429) {
          console.log("\nRate limited — stopping. Re-run this later to finish.");
          break;
        }
      }
    }

    console.log(`\nEmbedded ${ok}, failed ${failed}.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Failed to embed sources:", err.message || err);
  process.exit(1);
});
