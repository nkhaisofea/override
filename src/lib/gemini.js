// Thin wrapper around the Gemini REST API — no SDK dependency, so there's
// nothing extra to install or version-pin under time pressure.
//
// NOTE ON MODEL NAMES: Google renames/versions Gemini models fairly often.
// Both are overridable via env vars so a "model not found" error is a
// one-line .env.local fix, not a code change. If you hit that error, check
// the current model list at https://ai.google.dev/gemini-api/docs/models
// and update GEMINI_MODEL / GEMINI_EMBEDDING_MODEL accordingly.

const API_KEY = process.env.GEMINI_API_KEY;
const GENERATION_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function requireApiKey() {
  if (!API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to .env.local (see README)."
    );
  }
}

// Returns a plain number[] embedding vector for the given text.
export async function embedText(text) {
  requireApiKey();
  const res = await fetch(
    `${BASE_URL}/${EMBEDDING_MODEL}:embedContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini embedContent failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  // Response shape has varied between API versions — handle both.
  const values = data?.embedding?.values || data?.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini embedContent: no embedding values in response");
  return values;
}

const VERDICT_SYSTEM_INSTRUCTION = `You are Vitaura, a health-claim verification assistant. You are given:
1. A raw message a user received (it may include greetings, forwarding artifacts, or unrelated text).
2. A set of trusted source snippets retrieved for this message (may be empty).

Your job:
- Identify the core factual health claim being made in the message.
- Using ONLY the provided trusted sources as evidence, decide a verdict: "true", "false", "misleading", or "unverified".
  - Use "unverified" if the provided sources do not clearly support or refute the claim — do NOT guess from general knowledge when sources are empty or insufficient.
- Write a short (2-4 sentence) explanation a non-expert can understand, in the requested output language.
- Cite which source (by title) most supports your verdict, if any.

Respond ONLY with a single valid JSON object, no markdown fences, no extra text, matching exactly this shape:
{
  "claim": "the extracted core claim, in the requested output language",
  "verdict": "true" | "false" | "misleading" | "unverified",
  "explanation": "short explanation, in the requested output language",
  "citedSourceTitle": "title of the most relevant source, or null if none"
}`;

const LANGUAGE_NAMES = {
  ms: "Bahasa Melayu",
  en: "English",
  zh: "Simplified Chinese (中文)",
};

// sources: [{ title, text, url }]
export async function checkClaim({ rawMessage, language, sources }) {
  requireApiKey();
  const languageName = LANGUAGE_NAMES[language] || "English";

  const sourceBlock = sources.length
    ? sources
        .map(
          (s, i) => `Source ${i + 1} — "${s.title}" (${s.url}):\n${s.text}`
        )
        .join("\n\n")
    : "(no matching trusted sources were found for this message)";

  const prompt = `${VERDICT_SYSTEM_INSTRUCTION}

Output language: ${languageName}

Message received by the user:
"""
${rawMessage}
"""

Trusted source snippets:
"""
${sourceBlock}
"""`;

  const res = await fetch(
    `${BASE_URL}/${GENERATION_MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini generateContent: empty response");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 300)}`);
  }

  const verdict = ["true", "false", "misleading", "unverified"].includes(
    parsed.verdict
  )
    ? parsed.verdict
    : "unverified";

  return {
    claim: parsed.claim || rawMessage,
    verdict,
    explanation: parsed.explanation || "",
    citedSourceTitle: parsed.citedSourceTitle || null,
  };
}

export function verdictToRiskLevel(verdict) {
  if (verdict === "true") return "safe";
  if (verdict === "unverified") return "caution";
  return "high_risk"; // false or misleading
}
