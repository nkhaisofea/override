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
    <main className="mx-auto w-full max-w-sm px-5 pt-20 pb-16">
      <div className="mb-8 flex justify-center">
        <Logo href="/" />
      </div>
      <Card raised>
        <p className="label-tracked mb-1 text-xs text-accent">Admin access</p>
        <p className="mb-5 text-sm text-muted">
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
            className="field"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
          <PillButton type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Signing in…" : "Sign in"}
          </PillButton>
        </form>
      </Card>
      <p className="mt-6 text-center text-xs text-muted">
        Admin accounts are pre-provisioned — there is no public sign-up.
      </p>
    </main>
  );
}
