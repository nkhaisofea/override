"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";

// Route-level error boundary. Without this, an unhandled throw in any server
// component (the result page's Mongo read, most likely) shows Next's default
// grey error screen — which on a dark installed PWA looks like the app broke
// rather than like a recoverable hiccup.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 sm:max-w-xl sm:px-8">
      <Logo href="/" className="mb-8" />
      <p className="label-tracked mb-2 text-xs text-danger">Something went wrong</p>
      <h1 className="font-display mb-2 text-2xl font-semibold sm:text-3xl">
        We couldn&apos;t load that
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        This is on us, not you. Try again — if it keeps happening, the service may be
        temporarily unavailable.
      </p>
      <Card className="mb-6 border-danger/40">
        <p className="text-sm leading-relaxed">
          Nothing you checked was lost. Your history is stored on this device.
        </p>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row">
        <PillButton onClick={reset} className="flex-1">
          Try again
        </PillButton>
        <Link href="/" className="flex-1">
          <PillButton variant="outline" className="w-full">
            Back to Vitaura
          </PillButton>
        </Link>
      </div>
    </main>
  );
}
