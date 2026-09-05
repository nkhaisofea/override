"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card, PillButton, SectionLabel } from "@/components/Card";

export default function AdminLoginPage() {
  // useSearchParams needs a Suspense boundary — the protected layout bounces
  // here with ?next=<path> so an expired session returns you where you were.
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Only ever an internal path. A raw ?next= is attacker-controllable, so
  // anything that isn't a same-site absolute path is discarded — otherwise
  // this is an open redirect straight off the login page.
  const rawNext = searchParams.get("next") || "";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin/dashboard";

  const expired = searchParams.get("expired") === "1";

  useEffect(() => {
    // Already signed in? Skip the form.
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => {
        if (!cancelled && res.ok) router.replace(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setPassword("");
        return;
      }
      // replace, not push — the back button shouldn't return to a login form
      // the user has already passed.
      router.replace(next);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <div className="mb-8 flex justify-center">
        <Logo href="/" />
      </div>

      <Card raised>
        <SectionLabel tone="accent" className="mb-1">
          Admin access
        </SectionLabel>
        <p className="mb-5 text-sm leading-relaxed text-muted">
          Sign in to manage sources, FAQs, and verdicts.
        </p>

        {expired && (
          <p className="mb-4 rounded-xl bg-caution-softer px-3 py-2 text-xs leading-relaxed text-caution">
            Your session expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="admin-email" className="label-tracked mb-1.5 block text-[10px] text-muted">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="label-tracked mb-1.5 block text-[10px] text-muted"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="label-tracked absolute inset-y-0 right-0 px-4 text-[10px] text-muted transition-colors hover:text-accent"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}

          <PillButton
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="mt-2 w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </PillButton>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Admin accounts are pre-provisioned — there is no public sign-up.
        <br />
        <span className="text-faint">
          Create one with{" "}
          <code className="rounded bg-surface px-1 py-0.5 text-[11px]">npm run seed:admin</code>
        </span>
      </p>

      <p className="mt-6 text-center">
        <Link href="/" className="text-xs text-muted underline hover:text-accent">
          Back to Vitaura
        </Link>
      </p>
    </main>
  );
}
