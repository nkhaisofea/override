"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-5 pt-20 pb-16">
      <div className="flex justify-center mb-8">
        <Logo />
      </div>
      <Card raised>
        <p className="label-tracked text-xs mb-1" style={{ color: "var(--accent)" }}>
          Admin access
        </p>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
          Sign in to manage sources, FAQs, and verdicts.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <PillButton type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Signing in…" : "Sign in"}
          </PillButton>
        </form>
      </Card>
      <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
        Admin accounts are pre-provisioned — there is no public sign-up.
      </p>
    </main>
  );
}
