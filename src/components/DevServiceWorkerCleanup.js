"use client";

import { useEffect } from "react";

// Unregisters any service worker while running in development.
//
// The problem this solves is specific and very easy to lose an hour to. A
// service worker registered by a production build (`npm start`) keeps
// controlling `localhost:3000` afterwards — service workers are scoped to an
// origin, and localhost is the same origin whichever script is serving it. So
// switching back to `npm run dev` leaves the old worker in charge, answering
// from a precache full of hashed chunk URLs that the dev server no longer
// builds.
//
// The symptom is not an obvious caching error. It's `ChunkLoadError: Loading
// chunk N failed`, a blank screen, or edits that never appear — and it
// survives a normal refresh, because the worker intercepts that too.
//
// `disable: process.env.NODE_ENV === "development"` in next.config.mjs stops a
// NEW worker being built, but it cannot remove one that is already installed.
// This does.
//
// In a production build the whole body is dead code: NODE_ENV is inlined at
// build time, so the condition is statically false and nothing ships.

const RELOAD_FLAG = "vitaura_sw_cleanup_reloaded";

export default function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled || registrations.length === 0) return;

        await Promise.all(registrations.map((registration) => registration.unregister()));

        // Unregistering stops future interception but leaves the caches behind,
        // and those are what hold the stale chunks.
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        console.warn(
          `[vitaura] Removed ${registrations.length} stale service worker(s) left over ` +
            "from a production build. Reloading once to serve fresh assets."
        );

        // The current page is still controlled by the worker we just removed,
        // so a reload is needed for this load to come from the dev server.
        // Guarded by sessionStorage so a failure here can't become a loop.
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      } catch (err) {
        // Never let cleanup break the page it's trying to rescue.
        console.warn("[vitaura] service worker cleanup failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
