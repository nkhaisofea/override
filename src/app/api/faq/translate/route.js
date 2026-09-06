import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, DatabaseUnavailableError } from "@/lib/mongodb";
import { translateFaqEntries, GeminiError } from "@/lib/gemini";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

// Translate a page of FAQ entries into the reader's language.
//
// Two things keep this affordable on a 20-generations-a-day budget:
//
//   1. BATCHED — one model call for the whole page, not one per entry. Ten
//      entries translated individually would spend half a day's quota to
//      render a single page in Malay.
//   2. CACHED — each translation is stored on its own post under
//      `translations.<lang>`, so only entries never seen in that language
//      reach the model at all. In practice the first visitor in a language
//      pays once and everyone after them reads for free.
//
// A translation failure is NOT an error here: the caller falls back to the
// original text, which is still a readable, correct answer.

const MAX_ENTRIES = 24;

export async function POST(request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`faq-translate:${ip}`, { limit: 12, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = body?.language;
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `language must be one of: ${SUPPORTED_LANGUAGES.join(", ")}` },
      { status: 400 }
    );
  }

  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id) => typeof id === "string" && ObjectId.isValid(id)).slice(0, MAX_ENTRIES)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ translations: {} });
  }

  try {
    const { faqPosts } = await getCollections();
    const posts = await faqPosts
      .find(
        { _id: { $in: ids.map((id) => new ObjectId(id)) } },
        { projection: { title: 1, body: 1, language: 1, translations: 1 } }
      )
      .toArray();

    const translations = {};
    const missing = [];

    for (const post of posts) {
      const id = post._id.toString();
      // Posts have no language field historically; English is the assumption
      // that matches how they were written.
      const postLanguage = post.language || "en";

      if (postLanguage === language) continue; // original IS the translation
      const cached = post.translations?.[language];
      if (cached?.title) {
        translations[id] = { title: cached.title, body: cached.body };
        continue;
      }
      missing.push({ id, title: post.title || "", body: post.body || "" });
    }

    if (missing.length > 0) {
      const fresh = await translateFaqEntries({ entries: missing, language });

      // Persist so nobody pays for these again. Batched into one bulkWrite
      // rather than a write per entry.
      const ops = Object.entries(fresh).map(([id, value]) => ({
        updateOne: {
          filter: { _id: new ObjectId(id) },
          update: { $set: { [`translations.${language}`]: { ...value, at: new Date() } } },
        },
      }));
      if (ops.length) {
        await faqPosts
          .bulkWrite(ops, { ordered: false })
          .catch((err) => console.error("[faq translate] cache write failed:", err.message));
      }

      Object.assign(translations, fresh);
    }

    return NextResponse.json({ translations });
  } catch (err) {
    console.error("[/api/faq/translate] error:", err);
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json({ translations: {} }, { status: 200 });
    }
    if (err instanceof GeminiError) {
      // Deliberately a soft failure: the FAQ page shows the original wording,
      // which is still correct and readable. Breaking the page over a
      // translation would be a worse outcome than an untranslated one.
      return NextResponse.json({ translations: {}, degraded: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
