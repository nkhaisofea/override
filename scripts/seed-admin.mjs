// Creates (or updates the password of) an admin account in the `admins`
// collection. There is no public registration route by design — this
// script is the only way an admin account gets created.
//
// Usage:
//   node scripts/seed-admin.mjs admin@example.com "some-strong-password"
//
// Reads MONGODB_URI / MONGODB_DB from .env.local (or the real environment)
// since this is a plain Node script, not a Next.js request — Next.js's
// automatic .env.local loading doesn't apply here.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

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

  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/seed-admin.mjs admin@example.com "password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

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
    const admins = db.collection("admins");

    const passwordHash = bcrypt.hashSync(password, 10);
    const normalizedEmail = email.trim().toLowerCase();

    const result = await admins.updateOne(
      { email: normalizedEmail },
      { $set: { email: normalizedEmail, passwordHash, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`Created admin account: ${normalizedEmail}`);
    } else {
      console.log(`Updated password for existing admin: ${normalizedEmail}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Failed to seed admin:", err.message || err);
  process.exit(1);
});
