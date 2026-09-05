import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",

  // Serve the branded offline screen when a navigation fails with no network.
  // Without this the installed PWA shows the browser's own dinosaur/error
  // page, which breaks the illusion that this is an app.
  //
  // The plugin auto-detects a route named `/_offline`; this points it at
  // `/offline` instead so the route sits in the app directory under a normal
  // name and can be opened directly to check how it looks.
  fallbacks: { document: "/offline" },

  // The service worker only does anything in a production build, and having a
  // stale one registered in dev is a classic source of "why isn't my change
  // showing" confusion.
  disable: process.env.NODE_ENV === "development",

  // Take over immediately on update rather than waiting for every tab to
  // close. For a fact-checking tool, a user sitting on a stale cached bundle
  // is worse than a reload — verdict logic and source data change.
  register: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },

  // Delete precaches belonging to previous service worker versions on
  // activation. Without this, superseded builds' chunks accumulate in storage
  // and an updated worker can still be answering from an old cache.
  cleanUpOutdatedCaches: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Surface accidental client-side imports of server-only modules (the Mongo
  // driver, the Gemini wrapper) as build errors rather than as a mysterious
  // bundle bloat or a leaked key.
  serverExternalPackages: ["mongodb"],
};

export default withPWA(nextConfig);
