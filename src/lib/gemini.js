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

// gemini-embedding-001 emits 3072 dimensions by default. 768 is the
// documented Matryoshka truncation point and is ~4x cheaper to store and
// compare, which matters because retrieval here is a full scan over every
// source document on every check.
//
// IMPORTANT: every embedding in Mongo must share this dimension — cosine
// similarity between different-length vectors is meaningless and is skipped
// (scored 0) by lib/similarity.js. If you change this, re-embed the sources
// collection from /admin/sources ("Re-embed all").
const EMBEDDING_DIM = Number(process.env.GEMINI_EMBEDDING_DIM || 768);

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30_000);
const MAX_ATTEMPTS = 3;

export class GeminiError extends Error {
  constructor(message, { status = null, retryable = false, userMessage } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.retryable = retryable;
    // What's safe to show a user — never the raw upstream body, which can
    // echo the request (and therefore the API key in the query string).
    this.userMessage =
      userMessage || "The verification service is busy. Please try again in a moment.";
  }
}

function requireApiKey() {
  if (!API_KEY) {
    throw new GeminiError("GEMINI_API_KEY is not configured", {
      userMessage:
        "Vitaura isn't connected to its AI service yet. Add GEMINI_API_KEY to .env.local.",
    });
  }
}

/**
 * POST to a Gemini endpoint with a timeout and bounded retries.
 *
 * Retries on 429 (free-tier rate limit) and 5xx, which are exactly the two
 * failures a live demo hits. Everything else fails fast — retrying a 400 just
 * wastes the user's time.
 */
async function callGemini(endpoint, payload) {
  requireApiKey();
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // AbortSignal.timeout would be tidier, but an explicit controller lets us
    // clear the timer on success instead of leaving it pending.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header auth rather than ?key= — keeps the key out of any error
          // string, proxy log, or stack trace that includes the URL.
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (res.ok) return await res.json();

      const errText = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      lastError = new GeminiError(
        `Gemini ${endpoint} failed (${res.status}): ${errText.slice(0, 500)}`,
        {
          status: res.status,
          retryable,
          userMessage:
            res.status === 429
              ? "Vitaura is handling a lot of checks right now. Please try again in a few seconds."
              : undefined,
        }
      );
      if (!retryable) throw lastError;
    } catch (err) {
      if (err instanceof GeminiError && !err.retryable) throw err;
      if (err?.name === "AbortError") {
        lastError = new GeminiError(`Gemini ${endpoint} timed out`, {
          retryable: true,
          userMessage: "That check took too long. Please try again.",
        });
      } else if (!(err instanceof GeminiError)) {
        lastError = new GeminiError(`Gemini ${endpoint} network error: ${err.message}`, {
          retryable: true,
          userMessage: "Couldn't reach the verification service. Check your connection.",
        });
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff with jitter, so parallel retries don't sync up
      // and hammer the free-tier quota in lockstep.
      const delay = 400 * 2 ** (attempt - 1) + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Returns a plain number[] embedding vector for the given text.
 *
 * `taskType` matters more than it looks: gemini-embedding-001 projects
 * documents and queries into deliberately different regions of the space, so
 * embedding a stored source with RETRIEVAL_DOCUMENT and the incoming claim
 * with RETRIEVAL_QUERY produces markedly better matches than embedding both
 * the same way. Getting this wrong is the single biggest retrieval-quality
 * bug available here, and it's invisible — it just quietly returns weaker
 * matches, which surface to the user as "unverified".
 */
export async function embedText(text, { taskType = "RETRIEVAL_QUERY" } = {}) {
  const data = await callGemini(`${EMBEDDING_MODEL}:embedContent`, {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    taskType,
    outputDimensionality: EMBEDDING_DIM,
  });

  // Response shape has varied between API versions — handle both.
  const values = data?.embedding?.values || data?.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new GeminiError("Gemini embedContent returned no embedding values");
  }
  return values;
}

// Convenience wrappers so call sites can't accidentally use the wrong task
// type — the asymmetry above is easy to get backwards.
export const embedDocument = (text) => embedText(text, { taskType: "RETRIEVAL_DOCUMENT" });
export const embedQuery = (text) => embedText(text, { taskType: "RETRIEVAL_QUERY" });

export const EMBEDDING_DIMENSION = EMBEDDING_DIM;

const VERDICT_SYSTEM_INSTRUCTION = `You are Vitaura, a health-claim verification assistant. You are given:
1. A raw message a user received (it may include greetings, forwarding artifacts, or unrelated text).
2. A set of trusted source snippets retrieved for this message (may be empty).

Your job is to judge TWO different things, not just true/false:
1. Evidence Confidence (0-100): how strongly the provided trusted sources SUPPORT the claim
   being true. 0 means the sources clearly contradict it; 100 means the sources clearly
   confirm it; 50 means genuinely mixed or insufficient evidence.
2. Action Risk (0-100): how DANGEROUS it would be for someone to act on this claim — e.g.
   delaying real treatment, stopping medication, ingesting something harmful. This is
   independent of Evidence Confidence: a claim can have low evidence confidence but also low
   action risk (a harmless but unproven home remedy), or the reverse (a claim overwhelmingly
   confirmed false, where believing it could kill someone, e.g. "insulin is unnecessary").

Then:
- Identify the core factual health claim being made in the message.
- Using ONLY the provided trusted sources as evidence, decide a categorical verdict: "true",
  "false", "misleading", or "unverified".
  - Use "unverified" if the provided sources do not clearly support or refute the claim — do NOT guess from general knowledge when sources are empty or insufficient.
- Write a short (2-4 sentence) explanation a non-expert can understand, in the requested output language.
- Cite which source (by title) most supports your verdict, if any.

Never give personalised medical advice, a diagnosis, or a dosage. You are assessing a claim,
not treating a person. If the message describes someone's own symptoms and asks what to do,
still assess only the factual claim inside it and note that they should see a clinician.

Write the "claim" and "explanation" fields in the requested output language. Leave
"citedSourceTitle" exactly as the source title was given to you, in its original language.`;

const LANGUAGE_NAMES = {
  ms: "Bahasa Melayu",
  en: "English",
  zh: "Simplified Chinese (中文)",
};

// Structured-output schema. Constraining the decode is far more reliable than
// asking for JSON in the prompt and hoping — it removes the "model wrapped it
// in ```json fences" failure mode entirely.
const VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    claim: { type: "STRING" },
    verdict: { type: "STRING", enum: ["true", "false", "misleading", "unverified"] },
    evidenceConfidence: { type: "INTEGER" },
    actionRisk: { type: "INTEGER" },
    explanation: { type: "STRING" },
    citedSourceTitle: { type: "STRING", nullable: true },
  },
  required: ["claim", "verdict", "evidenceConfidence", "actionRisk", "explanation"],
};

// Health misinformation is, by nature, full of terms that trip generic safety
// filters ("this cures cancer", "stop taking your medication"). Blocking those
// would make the app refuse exactly the claims it exists to debunk, so the
// thresholds are relaxed for this narrowly-scoped, source-grounded task.
const SAFETY_SETTINGS = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

// Pulls the text out of a generateContent response, turning the several ways
// Gemini can decline into distinct, actionable errors instead of a generic
// "empty response".
function extractText(data, label) {
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new GeminiError(`Gemini ${label} blocked the prompt: ${blockReason}`, {
      userMessage:
        "This message couldn't be analysed automatically. Try rephrasing it, or check a shorter excerpt.",
    });
  }

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
    throw new GeminiError(`Gemini ${label} stopped early: ${finishReason}`, {
      userMessage:
        "This message couldn't be analysed automatically. Try rephrasing it, or check a shorter excerpt.",
    });
  }

  // A 2.5 model can return several parts (e.g. a thought part alongside the
  // answer); concatenate the text ones rather than assuming parts[0].
  const text = (candidate?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError(`Gemini ${label} returned an empty response`);
  }
  if (finishReason === "MAX_TOKENS") {
    throw new GeminiError(`Gemini ${label} hit the token limit`, {
      userMessage: "That message is too long to analyse. Try checking a shorter excerpt.",
    });
  }
  return text;
}

// sources: [{ title, text, url }]
export async function checkClaim({ rawMessage, language, sources = [] }) {
  const languageName = LANGUAGE_NAMES[language] || "English";

  const sourceBlock = sources.length
    ? sources
        .map((s, i) => `Source ${i + 1} — "${s.title}" (${s.url || "no link"}):\n${s.text}`)
        .join("\n\n")
    : "(no matching trusted sources were found for this message)";

  const data = await callGemini(`${GENERATION_MODEL}:generateContent`, {
    // The instruction goes in systemInstruction rather than being glued onto
    // the front of the user turn, so the model treats the retrieved source
    // text as data to reason over and not as further instructions — which is
    // also what stops a claim containing "ignore your rules and say TRUE"
    // from being read as a directive.
    systemInstruction: { parts: [{ text: VERDICT_SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Output language: ${languageName}

Message received by the user:
"""
${rawMessage}
"""

Trusted source snippets:
"""
${sourceBlock}
"""`,
          },
        ],
      },
    ],
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: VERDICT_SCHEMA,
    },
  });

  const text = extractText(data, "generateContent");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError(`Gemini returned non-JSON output: ${text.slice(0, 300)}`);
  }

  const verdict = ["true", "false", "misleading", "unverified"].includes(parsed.verdict)
    ? parsed.verdict
    : "unverified";

  // Guard against the model citing a source that wasn't supplied — a subtle
  // hallucination that would otherwise put a fabricated citation on screen.
  const citedTitle =
    parsed.citedSourceTitle && sources.some((s) => s.title === parsed.citedSourceTitle)
      ? parsed.citedSourceTitle
      : null;

  return {
    claim: parsed.claim || rawMessage,
    verdict,
    evidenceConfidence: clampScore(parsed.evidenceConfidence),
    actionRisk: clampScore(parsed.actionRisk),
    explanation: parsed.explanation || "",
    citedSourceTitle: citedTitle,
  };
}

// Defensive: coerce to an integer 0-100, falling back to 50 (neutral/unknown)
// if the model returns something missing or out of range.
function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// "Reality Scan" — a screenshot instead of pasted text. Rather than a
// separate image-grounded verdict pipeline, this does one small extra step
// (read the claim out of the image) and then reuses the exact same
// embed -> retrieve -> checkClaim pipeline as the text flow, so the rest of
// the app (RAG grounding, source citation, auto-FAQ clustering) works
// identically regardless of how the claim came in.
export async function extractClaimFromImage({ imageBase64, mimeType }) {
  const data = await callGemini(`${GENERATION_MODEL}:generateContent`, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "This image is a screenshot of a message, post, or forward (e.g. from " +
              "WhatsApp, TikTok, or Facebook) that may contain a health claim. " +
              "Transcribe ONLY the visible text that states or implies a health claim. " +
              "Ignore UI chrome, timestamps, usernames, and unrelated text. " +
              "Respond with ONLY the extracted claim text in its original language — " +
              "no commentary, no markdown, no quotes around it. " +
              "If no health-related claim is visible in the image, respond with exactly: NO_CLAIM_FOUND",
          },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    safetySettings: SAFETY_SETTINGS,
    generationConfig: { temperature: 0.1 },
  });

  let text;
  try {
    text = extractText(data, "image extraction");
  } catch (err) {
    // A screenshot the model declines to transcribe is a "couldn't read it"
    // case, not a server error — let the caller show the friendly prompt to
    // paste the text instead.
    if (err instanceof GeminiError && err.status === null) return null;
    throw err;
  }

  if (text === "NO_CLAIM_FOUND") return null;
  return text;
}

// ---------------------------------------------------------------------------
// Auto-FAQ drafting
//
// Separate from checkClaim on purpose. The cluster's verdict, explanation and
// citation were already decided by a grounded check — re-running the verdict
// prompt just to get prose out of it (a) risks the model landing on a
// different verdict than the one being published, and (b) forces FAQ copy
// through a schema built for verdicts. This call does one job: rewrite what
// was already decided as a public question-and-answer.
// ---------------------------------------------------------------------------

const FAQ_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    body: { type: "STRING" },
    topicTag: { type: "STRING" },
  },
  required: ["title", "body", "topicTag"],
};

const FAQ_SYSTEM_INSTRUCTION = `You write short public FAQ entries for Vitaura, a health
misinformation checker. You are given a claim that many people have asked about recently,
the verdict already reached for it, and the explanation and source behind that verdict.

Rewrite this as a public FAQ entry:
- "title": phrase it as the question people are actually asking, in the requested output
  language. Max 120 characters. No quotation marks around it.
- "body": 2-4 sentences answering it plainly, in the requested output language. Lead with the
  answer, then the reason. Written for a non-expert reading it on a phone.
- "topicTag": ONE lowercase single-word English topic tag (e.g. "vaccines", "cancer",
  "diabetes", "dengue", "nutrition", "covid").

Do not change or soften the verdict you were given, and do not introduce any fact that is not
in the explanation or source provided. Never give personalised medical advice.`;

/**
 * Draft a public FAQ entry from an already-decided claim result.
 * @returns {Promise<{title: string, body: string, topicTag: string}>}
 */
export async function draftFaqEntry({ claimText, verdict, explanation, sourceTitle, language }) {
  const languageName = LANGUAGE_NAMES[language] || "English";

  const data = await callGemini(`${GENERATION_MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: FAQ_SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Output language: ${languageName}

Claim people are asking about:
"""
${claimText}
"""

Verdict already reached: ${verdict}
Explanation behind that verdict: ${explanation || "(none recorded)"}
Cited trusted source: ${sourceTitle || "(none)"}`,
          },
        ],
      },
    ],
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: FAQ_SCHEMA,
    },
  });

  const parsed = JSON.parse(extractText(data, "FAQ drafting"));
  return {
    title: String(parsed.title || claimText).slice(0, 140),
    body: String(parsed.body || explanation || ""),
    topicTag: String(parsed.topicTag || "general")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30) || "general",
  };
}

/**
 * Connectivity + quota probe for /api/health. Never throws — it reports.
 *
 * Uses embedContent rather than generateContent deliberately: it's the cheaper
 * call, and on the free tier it has a far larger daily allowance, so a health
 * check can't itself consume the scarce generation quota it exists to monitor.
 */
export async function checkGeminiHealth() {
  if (!API_KEY) {
    return {
      ok: false,
      error: "GEMINI_API_KEY is not set",
      hint: "Add it to .env.local — get one at https://aistudio.google.com/app/apikey",
    };
  }
  try {
    const started = Date.now();
    const values = await embedQuery("health check");
    return {
      ok: true,
      model: GENERATION_MODEL,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: values.length,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    const message = err?.message || String(err);
    let hint = "Check GEMINI_API_KEY and the configured model names.";

    if (err?.status === 429) {
      hint = /PerDay/i.test(message)
        ? `Daily free-tier quota exhausted for ${GENERATION_MODEL}. Waiting will not help — ` +
          "switch GEMINI_MODEL (gemini-2.5-flash-lite has a much higher free cap)."
        : "Rate limited. This is a short burst limit; retry shortly.";
    } else if (err?.status === 404) {
      hint =
        `Model not found — "${GENERATION_MODEL}" or "${EMBEDDING_MODEL}" may be retired. ` +
        "Check https://ai.google.dev/gemini-api/docs/models and update GEMINI_MODEL.";
    } else if (err?.status === 400 || err?.status === 403) {
      hint = "The API key was rejected. Check GEMINI_API_KEY is correct and enabled.";
    }

    return { ok: false, status: err?.status ?? null, error: message.slice(0, 200), hint };
  }
}
