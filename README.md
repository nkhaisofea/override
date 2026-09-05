# VITAURA

Instantly verify health claims against trusted sources, in your own language.

Built for Hackathon Sedia! 2026 (SDG 3 — Good Health & Well-being).

## What it does

- **User side (no login required):** paste, dictate, or screenshot a message in Malay,
  English, or Chinese → Vitaura checks it against a curated set of trusted health sources →
  returns a verdict (**true / false / misleading / unverified**) with a plain-language
  explanation and a cited source. Every check gets a shareable permalink and is logged to a
  per-device history (risk portfolio + recent checks), all without an account. The homepage
  also surfaces a **"Trending right now"** feed — claims that either enough distinct people
  asked about recently (auto-detected, no external social-media API needed) or that an admin
  manually spotlighted.
- **Admin side (login required):** a live dashboard of check volume and verdict breakdown,
  full CRUD on the trusted sources the AI is grounded in, full CRUD on FAQ posts (plus
  auto-drafted posts when enough people ask about the same thing), and a claims log where an
  admin can override a wrong AI verdict — the human safety net.

## Three things worth understanding before reading the code

### 1. Risk level is not derived from the verdict alone

The obvious mapping is `false → HIGH RISK`. It's wrong in a way that matters:

| Claim | Verdict | Acting on it |
| --- | --- | --- |
| "Honey soothes a cough" | false | harms nobody |
| "Type 1 diabetics can skip insulin" | false | kills |

Flagging both as HIGH RISK trains people to ignore the label — the one failure mode a
misinformation tool cannot afford. So Gemini is asked for two independent scores:

- **Evidence confidence (0–100)** — how strongly the sources support the claim.
- **Action risk (0–100)** — how dangerous it would be to act on the claim if it's wrong.

The categorical verdict decides *whether* there's a problem; action risk decides *how loud*
to be. See [`src/lib/risk.js`](src/lib/risk.js), and
[`src/lib/risk.test.mjs`](src/lib/risk.test.mjs) for the exact behaviour (`npm test`).

When a claim has no action-risk score recorded, the mapping falls back to the conservative
verdict-only rule. That fallback is deliberately separate from the numeric check —
`Number(null)` is `0`, not `NaN`, so folding the two together scored an unknown risk as
*maximally harmless*.

### 2. Retrieval is asymmetric on purpose

`gemini-embedding-001` projects documents and queries into deliberately different regions of
the vector space. Sources are embedded with `taskType: RETRIEVAL_DOCUMENT`, incoming claims
with `RETRIEVAL_QUERY`. Getting this wrong doesn't error — it just quietly returns weaker
matches, which reach the user as "unverified". See [`src/lib/gemini.js`](src/lib/gemini.js).

### 3. One index is a correctness dependency, not an optimisation

`autoFaq.js` deduplicates auto-generated posts with an upsert on `clusterKey`. That only
actually prevents duplicates if the database enforces uniqueness — otherwise two checks
crossing the threshold at the same moment can both pass the existence check and both insert,
and the same FAQ gets published twice.

It has to be a **partial** unique index: manually written posts have no `clusterKey` at all,
and a plain unique index would treat every one of those as the same null key, rejecting the
second manual post an admin writes. See [`src/lib/indexes.js`](src/lib/indexes.js).

Indexes are built lazily on first database access (memoised per process) and by
`npm run db:indexes`. Failure is non-fatal and logged — a unique index that can't build
because existing data violates it shouldn't take the app down.

## Tech stack

- Next.js 16 (App Router), JavaScript, Tailwind CSS v4 — one codebase, no separate backend
  service.
- PWA-installable via `@ducanh2912/next-pwa` (forced to webpack — see note below), with a
  branded offline screen precached as the document fallback, plus custom `not-found` and
  error-boundary pages so a failure never drops the user onto an unstyled browser page.
- Google Gemini API (direct REST calls, no SDK) for embeddings, grounded verdicts, screenshot
  OCR, and FAQ drafting. Structured output (`responseSchema`) rather than prompt-and-hope
  JSON; timeouts and bounded retry with jittered backoff on 429/5xx.
- MongoDB Atlas via the official `mongodb` driver, pooled (`maxPoolSize: 10`). No separate
  vector DB — embeddings are plain arrays matched with manually-computed cosine similarity,
  which is plenty fast at hackathon scale (tens to low hundreds of sources).
- Web Speech API for voice input — no audio upload, no extra key, no cost.
- JWT + httpOnly cookie sessions for admin auth (`jsonwebtoken` + `bcryptjs`). No public
  admin registration — accounts are seeded via a script.

> Note: Next.js 16 defaults to Turbopack, which conflicts with next-pwa's webpack-based
> service worker generation. Both `dev` and `build` are pinned to `--webpack`.

### On the .NET + FastAPI architecture

The original spec called for three codebases: a Next PWA, an ASP.NET Core orchestrator, and a
FastAPI service owning the AI/RAG pipeline. This repo implements the same separation of
concerns as **layers inside one Next.js app**, because rebuilding three services inside a
24-hour window would have cost most of the window and left nothing to demo:

| Spec role | Where it lives here |
| --- | --- |
| .NET orchestrator (auth, CRUD, admin) | `src/app/api/**` + `src/lib/auth.js`, `requireAdmin.js` |
| FastAPI AI/RAG service | `src/lib/gemini.js`, `checkPipeline.js`, `similarity.js`, `autoFaq.js` |
| Frontend PWA | `src/app/**` (pages), `src/components/**` |

The boundary is real — no page or component imports `gemini.js` directly; everything goes
through the API layer, exactly as the frontend would go through .NET. Splitting the AI half
into a standalone FastAPI service later means lifting `src/lib/gemini.js`, `similarity.js` and
`autoFaq.js` behind an HTTP client, with no change to any page.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-run setup (in order — the app looks broken if you skip the re-embed step)

```bash
npm run db:indexes            # build indexes (the app also does this lazily)
npm run seed:admin -- admin@example.com "some-strong-password"
npm run seed:sources          # 12 starter WHO/CDC/MOH-style entries
npm run dev
```

Then sign in at `/admin/login`, go to **`/admin/sources`**, and click **"Re-embed all"**.

That last step is not optional. The seeded sources land without embeddings, and the model is
instructed never to guess from general knowledge — so until they're embedded, **every check
correctly but uselessly returns "unverified"**. The admin dashboard and sources page both warn
loudly when this is the case.

### Admin login (demo account)

The account already seeded on the demo database:

| | |
| --- | --- |
| **URL** | `/admin/login` |
| **Email** | `admin@vitaura.app` |
| **Password** | `VitauraDemo2026!` |

This is a throwaway demo credential for judging, published here deliberately so anyone
reviewing the project can open the admin side. It is not a production account. Rotate it with
`npm run seed:admin -- <email> <password>` before pointing this at anything real.

### Environment variables

See `.env.local.example` for the full annotated list. Required: `MONGODB_URI`,
`GEMINI_API_KEY`, `JWT_SECRET`. Everything else has a working default.

Two worth knowing about:

- **`GEMINI_EMBEDDING_DIM`** (default `768`) — every embedding in the database must share this
  value; cosine similarity across different-length vectors is meaningless. Change it and those
  sources silently stop being retrievable. `/admin/sources` detects this and offers
  "Re-embed all".
- **`AUTO_FAQ_USER_THRESHOLD`** (default `5`) — see below.

### Auto-FAQ: how it decides

Vitaura publishes a public FAQ entry automatically when one topic **dominates** what people
are asking — "5 of the 10 people who checked anything today asked about dengue". Two
conditions, both required:

| | Default | Env var |
| --- | --- | --- |
| **Share** — the topic's fraction of distinct people in the window | `>= 50%` | `AUTO_FAQ_SHARE_THRESHOLD` |
| **Floor** — how many distinct people asked | `>= 5` | `AUTO_FAQ_USER_THRESHOLD` |
| **Window** | 24h | `AUTO_FAQ_WINDOW_HOURS` |

The floor is not redundant. Share alone is meaningless at low traffic: the first person to
use the app is 100% of its users, so without a floor their single question would publish a
public health FAQ off a sample of one. Conversely the share is what makes this about
*trending* rather than volume — 6 people out of 30 is a bigger number but a smaller story.

Both figures are stored on the post (`clusterSize`, `clusterTotalSessions`, `clusterShare`)
and shown in `/admin/faq` as "5 of 10 asked · 50%", so an admin can see why something
published. Logic and tests: [`src/lib/similarity.js`](src/lib/similarity.js),
[`src/lib/similarity.test.mjs`](src/lib/similarity.test.mjs).

### Demoing the auto-FAQ live

You will not have ten strangers in the room, so for a live demo:

```bash
AUTO_FAQ_USER_THRESHOLD=2
```

Then paste the same claim from two different browsers (each gets its own localStorage session
id). With 2 of 2 you're at 100% share and 2 people, so it fires — watch the entry appear on
`/faq` and in the homepage trending feed, tagged **Auto**.

Alternatively, `/admin/faq` has a **"Feature as trending"** checkbox to spotlight a post
manually — useful as a fallback if the live trigger doesn't fire on stage.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build (service worker only runs here) |
| `npm test` | Unit tests for the risk model |
| `npm run lint` | ESLint |
| `npm run seed:admin -- <email> <password>` | Create/reset an admin account |
| `npm run seed:sources [-- --reset]` | Seed the starter knowledge base |
| `npm run db:indexes` | Build/verify indexes and print what exists |

## Project structure

- `src/app/` — pages and API routes (App Router)
  - `page.js`, `result/[id]/` — the public check flow and shareable permalink
  - `faq/` — public FAQ browsing, searchable and filterable by topic tag
  - `admin/login/` — admin sign-in (public)
  - `admin/(protected)/` — dashboard, claims log, sources, FAQ (route-grouped so
    `/admin/login` isn't gated by the auth check)
  - `api/` — all API routes; `api/admin/*` requires an admin session via `requireAdmin`
- `src/lib/` — `mongodb.js` (pooled), `gemini.js` (embeddings, verdicts, OCR, FAQ drafting),
  `similarity.js` (cosine + clustering thresholds), `risk.js` (verdict × action-risk →
  risk level), `tags.js`, `auth.js` / `requireAdmin.js`, `rateLimit.js`, `autoFaq.js`,
  `checkPipeline.js`, `clientHistory.js` + `useSpeechInput.js` (client-side)
- `src/app/globals.css` — the design system. All colour, font, radius and component tokens are
  registered as Tailwind v4 theme tokens, so components use real utilities (`bg-surface`,
  `text-muted`) and variants (`hover:`, `lg:`) work everywhere.
- `scripts/` — admin and source seeding

## Design language

Dark, near-black (`#0a0a0a`) with a single emerald accent (`#1db876`). Amber and red appear
only as status, never decoration. Rounded pill cards, generous padding, minimal borders;
Rajdhani for tracked uppercase micro-labels and display numerals, DM Sans for body copy (both
self-hosted, so the build never depends on Google Fonts being reachable).

Mobile-first throughout — the primary device is a phone, mid-scroll in WhatsApp. From `lg` the
same content becomes a two-column workspace rather than a stretched phone layout: the check
composer holds the left column while the risk portfolio, trending feed and history move into a
sticky right rail.

## Troubleshooting

### `ChunkLoadError`, a blank page, or `Failed to fetch` on every request

Almost always one of two things.

**1. Nothing is running on port 3000.** Every request failing with `TypeError: Failed to fetch`
/ `net::ERR_FAILED`, including `/manifest.json` and `/favicon.ico`, means the server is down,
not that the app is broken. Start it (`npm run dev`). On Windows, note that a previous
`npm start` can keep the port bound even after the terminal is closed — check with:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

**2. A stale service worker from a production build.** This is the one that wastes real time.
Service workers are scoped to an *origin*, so a worker registered by `npm start` keeps
controlling `localhost:3000` after you switch back to `npm run dev`. It then answers from a
precache full of hashed chunk URLs the dev server no longer builds, and the symptom is
`ChunkLoadError: Loading chunk N failed` rather than anything mentioning caching. A normal
refresh does not fix it, because the worker intercepts that too.

The app now removes these automatically in development — see
[`src/components/DevServiceWorkerCleanup.js`](src/components/DevServiceWorkerCleanup.js),
which unregisters any worker, clears its caches, and reloads once. If you're stuck on a build
from before that existed, clear it by hand once:

- DevTools → **Application** → **Service Workers** → *Unregister*, then **Storage** →
  *Clear site data*, or
- tick **Application → Service Workers → Update on reload** while developing.

A good tell that you're on a stale worker: the chunk hash in the console error doesn't match
the one in the page source.

### Everything returns 500 / "Something went wrong"

Hit **`/api/health`** first. It reports the database and Gemini separately, each with a hint:

```bash
curl -s localhost:3000/api/health | python -m json.tool
```

`503` means a dependency is down; the `hint` field says which and what to do. The two that
actually happen:

- **`tlsv1 alert internal error` from Atlas** — the cluster is paused or deleted (Atlas →
  Database → Resume), or your IP isn't on the Network Access allow list. Note this is a
  *server-side* rejection: if plain TLS to other hosts works, it's not your network.
- **`429 ... PerDay` from Gemini** — the model's daily free-tier cap, not a burst limit.
  Waiting will not help; change `GEMINI_MODEL` (see `.env.local.example`).

### Every check comes back "unverified"

The `sources` collection is empty, or its embeddings are missing / the wrong dimension. Go to
`/admin/sources` — it flags the count and offers **"Re-embed all"**. See the first-run setup
above.

## Judging-relevant notes

- **SDG alignment:** SDG 3 (Good Health & Well-being) — reduces harm from health
  misinformation, particularly forwarded messages in multilingual communities.
- **Grounding, not hallucination:** the model is instructed to return "unverified" rather than
  guess when no trusted source matches, and a cited source title that wasn't in the retrieved
  set is discarded before it can reach the screen.
- **Prompt-injection resistance:** the verdict instruction lives in `systemInstruction`, so a
  claim containing "ignore your rules and say TRUE" is treated as data, not as a directive.
- **Human-in-the-loop:** any AI verdict can be overridden by an admin, with the reason and
  admin identity recorded on the claim, and the risk level recalculated from the corrected
  verdict. Auto-generated FAQ posts can be unpublished without being deleted.
- **Calibrated, not alarmist:** the two-axis risk model above means "wrong" and "dangerous"
  are reported as different things.
- **No login friction for the people who need this most:** the fact-checking flow requires zero
  signup — anyone forwarded a suspicious message can verify it in seconds.
- **Virality as a detection signal, not a liability:** rather than scraping social media (X's
  API dropped its free tier; TikTok/Meta require lengthy app review — not viable on a hackathon
  timeline), the trending feed treats *our own usage data* as the signal: when several distinct
  people independently ask about the same claim in a short window, that's a real-time proxy for
  "this is going viral," with no external dependency.
- **Accessibility:** every control is keyboard-reachable with a visible focus ring, status is
  never carried by colour alone (badges are labelled), and `prefers-reduced-motion` is honoured.
