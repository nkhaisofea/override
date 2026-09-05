# VITAURA

Instantly verify health claims against trusted sources, in your own language.

Built for Hackathon Sedia! 2026 (SDG 3 — Good Health & Well-being).

## Tech stack

- Next.js (App Router) + Tailwind CSS
- PWA-installable (`@ducanh2912/next-pwa`)
- Gemini API for claim verification
- MongoDB Atlas for data storage

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test PWA install behavior (service worker only runs in production builds):

```bash
npm run build
npm run start
```

## Project structure

- `src/app/` — pages and API routes (App Router)
- `public/manifest.json` — PWA app manifest
- `public/icons/` — app icons (currently placeholders, swap once branding is finalized)
