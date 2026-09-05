# VITAURA

Instantly verify health claims against trusted sources, in your own language.

Built for Hackathon Sedia! 2026 (SDG 3 — Good Health & Well-being).

## What it does

- **User side (no login required):** paste a message/claim in Malay, English, or Chinese →
  Vitaura checks it against a curated set of trusted health sources → returns a verdict
  (**true / false / misleading / unverified**) with a plain-language explanation and a cited
  source. Every check gets a shareable permalink and is logged to a per-device history
  (risk portfolio + recent checks), all without an account. The homepage also surfaces a
  **"Trending right now"** feed — claims that either enough distinct people asked about
  recently (auto-detected, no external social-media API needed) or that an admin manually
  spotlighted — so there's something worth browsing even before you paste your own claim.
- **Admin side (login required):** a dashboard of check volume and verdict breakdown, full
  CRUD on the trusted sources the AI is grounded in, full CRUD on FAQ posts (plus
  auto-drafted FAQ posts when enough people ask about the same thing), and a claims log
  where an admin can override a wrong AI verdict — the human safety net.

## Tech stack

- Next.js 16 (App Router), JavaScript, Tailwind CSS v4 — one codebase, no separate backend
  service.
- PWA-installable via `@ducanh2912/next-pwa` (forced to webpack — see note below).
- Google Gemini API (direct REST calls, no SDK) for embeddings + grounded verdict generation.
- MongoDB Atlas via the official `mongodb` driver, with connection pooling. No separate
  vector DB — source/claim embeddings are stored as plain arrays and matched with
  manually-computed cosine similarity, which is plenty fast at hackathon scale.
- JWT + httpOnly cookie sessions for admin auth (`jsonwebtoken` + `bcryptjs`). No public
  admin registration — accounts are seeded via a script (below).

> Note: Next.js 16 defaults to Turbopack, which conflicts with next-pwa's webpack-based
> service worker generation. Both `dev` and `build` scripts are pinned to `--webpack`.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in real values, see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test PWA install behavior (the service worker only runs in production builds):

```bash
npm run build
npm run start
```

### Environment variables

See `.env.local.example` for the full list with comments. You need:

- `MONGODB_URI` / `MONGODB_DB` — a MongoDB Atlas connection string (free tier works).
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey).
- `GEMINI_MODEL` / `GEMINI_EMBEDDING_MODEL` — Gemini model IDs. These are env-configurable
  on purpose since Google's model names change fairly often; if you see a "model not
  found" error, check [the current model list](https://ai.google.dev/gemini-api/docs/models)
  and update these.
- `JWT_SECRET` — any long random string, used to sign admin sessions.

### Creating an admin account

There's no public sign-up route on purpose. Create (or reset the password of) an admin
account with:

```bash
npm run seed:admin -- admin@example.com "some-strong-password"
```

Then sign in at `/admin/login`.

### Seeding trusted sources

The AI's verdicts are only as good as what's in the `sources` collection. Add a handful of
MOH/WHO-style entries from `/admin/sources` once you're logged in — each one is embedded on
save so it's immediately usable for matching.

### Seeding the "Trending right now" feed for a demo

The homepage trending feed normally fills itself in once 5+ distinct sessions ask about the
same claim within 24h (see `lib/autoFaq.js`) — but that needs real traffic you won't have
before judging. To fake a realistic homepage for the demo, go to `/admin/faq`, add a post
about a real viral myth (e.g. "pineapple cures cancer"), set a **verdict**, and check
**"Feature as Trending"**. It'll show up immediately in the feed, same as an auto-detected one.

## Project structure

- `src/app/` — pages and API routes (App Router)
  - `src/app/page.js`, `src/app/result/[id]/` — the public check flow
  - `src/components/TrendingSection.js`, `src/app/api/trending/` — the "Trending right now"
    homepage feed
  - `src/app/faq/` — public FAQ browsing
  - `src/app/admin/login/` — admin sign-in (public)
  - `src/app/admin/(protected)/` — dashboard, sources, FAQ, and claims-log admin pages
    (route-grouped so `/admin/login` isn't gated by the auth check)
  - `src/app/api/` — all API routes, mirroring the above (`api/admin/*` requires an admin
    session via `requireAdmin`)
- `src/lib/` — shared server logic: `mongodb.js` (pooled connection), `gemini.js`
  (embeddings + grounded verdicts), `similarity.js` (cosine matching + auto-FAQ thresholds),
  `auth.js` / `requireAdmin.js` (admin JWT auth), `rateLimit.js` (in-memory sliding window),
  `autoFaq.js` (clustering logic), `clientHistory.js` (client-side, localStorage)
- `scripts/seed-admin.mjs` — creates/updates an admin account
- `public/manifest.json` — PWA app manifest
- `public/icons/` — app icons (currently placeholders, swap once branding is finalized)

## Judging-relevant notes

- **SDG alignment:** SDG 3 (Good Health & Well-being) — reduces harm from health
  misinformation, particularly forwarded messages in multilingual communities.
- **Grounding, not hallucination:** the AI is explicitly instructed to return "unverified"
  rather than guess when no trusted source matches — verdicts are only ever generated from
  retrieved source text, never general model knowledge.
- **Human-in-the-loop:** every AI verdict can be overridden by an admin, with the override
  reason and admin identity recorded on the claim.
- **No login friction for the people who need this most:** the actual fact-checking flow
  requires zero signup — anyone forwarded a suspicious message can verify it in seconds.
- **Virality as a detection signal, not a liability:** instead of scraping social media (X's
  API dropped its free tier in 2026; TikTok/Meta require lengthy app review — not viable on a
  hackathon timeline), the "Trending right now" feed treats *our own usage data* as the
  signal: when several distinct people independently ask about the same claim in a short
  window, that's a real-time proxy for "this is going viral," surfaced without any external
  dependency.
