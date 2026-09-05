"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";
import { StatusDot, RISK_CONFIG, VERDICT_CONFIG } from "@/components/StatusBadge";
import TrendingSection from "@/components/TrendingSection";
import {
  getSessionId,
  getHistory,
  addToHistory,
  getPortfolioCounts,
} from "@/lib/clientHistory";

const LANGUAGES = [
  { code: "ms", label: "Bahasa Melayu" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

export default function HomePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [portfolio, setPortfolio] = useState({ safe: 0, caution: 0, high_risk: 0 });

  useEffect(() => {
    // Intentional: localStorage is only readable client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch on the
    // server-rendered pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getHistory());
    setPortfolio(getPortfolioCounts());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/claims/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      addToHistory({
        id: data.id,
        claim: data.claim,
        verdict: data.verdict,
        riskLevel: data.riskLevel,
        createdAt: new Date().toISOString(),
      });
      router.push(`/result/${data.id}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-8">
      <header className="flex items-center justify-between mb-8">
        <Logo />
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--accent)" }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--accent)" }} />
        </span>
      </header>

      <h1 className="text-2xl font-semibold mb-1">Your health reality layer</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        What did you receive? Check it before you trust, act, or share.
      </p>

      <Card raised className="mb-4" style={{ borderColor: "var(--accent)" }}>
        <p className="label-tracked text-xs mb-3" style={{ color: "var(--accent)" }}>
          Paste a message
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the forwarded message, post, or claim you want to check…"
            rows={5}
            maxLength={2000}
            className="w-full resize-none rounded-2xl border border-border bg-transparent p-4 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="flex gap-2 mt-3 mb-4">
            {LANGUAGES.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className="label-tracked flex-1 rounded-full px-2 py-2 text-[11px] border transition"
                style={
                  language === l.code
                    ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                    : { background: "transparent", borderColor: "var(--border)", color: "var(--muted)" }
                }
              >
                {l.label}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <PillButton type="submit" disabled={!text.trim() || loading} className="w-full">
            {loading ? "Checking…" : "Semak · Check"}
          </PillButton>
        </form>
      </Card>

      <TrendingSection />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="opacity-50">
          <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
            Reality Scan
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Scan a screenshot — coming soon
          </p>
        </Card>
        <Card className="opacity-50">
          <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
            Ask Vitaura
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Voice input — coming soon
          </p>
        </Card>
      </div>

      <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
        Risk portfolio
      </p>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {["safe", "caution", "high_risk"].map((key) => (
          <Card key={key} className="text-center">
            <p className="text-2xl font-semibold" style={{ color: RISK_CONFIG[key].color }}>
              {portfolio[key]}
            </p>
            <p className="label-tracked text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              {RISK_CONFIG[key].label}
            </p>
          </Card>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
            Recent checks
          </p>
          <div className="flex flex-col gap-2">
            {history.slice(0, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/result/${item.id}`)}
                className="text-left"
              >
                <Card className="flex items-center gap-3 py-3">
                  <StatusDot riskLevel={item.riskLevel} />
                  <span className="flex-1 text-sm truncate">{item.claim}</span>
                  <span className="label-tracked text-[10px] shrink-0" style={{ color: "var(--muted)" }}>
                    {RISK_CONFIG[item.riskLevel]?.label} · {VERDICT_CONFIG[item.verdict]?.label}
                  </span>
                  <span style={{ color: "var(--muted)" }}>›</span>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-10 text-center">
        <a href="/faq" className="text-xs underline" style={{ color: "var(--muted)" }}>
          Browse health FAQs
        </a>
      </div>
    </main>
  );
}
