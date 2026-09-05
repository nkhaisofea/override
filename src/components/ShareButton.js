"use client";

import { useState } from "react";

// Sharing the verdict back into the group chat the myth came from is the whole
// point of the permalink — a correction that stays on one person's phone
// doesn't stop anything. Uses the native share sheet where it exists (every
// mobile browser that matters), and falls back to copying the link on desktop.
export default function ShareButton({ title }) {
  const [state, setState] = useState("idle"); // idle | copied | failed

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Checked with Vitaura", text: title, url });
        return;
      } catch (err) {
        // AbortError = the user dismissed the share sheet. That's a normal
        // outcome, not a failure to fall back from.
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="label-tracked rounded-full border border-border px-4 py-2 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Share"}
    </button>
  );
}
