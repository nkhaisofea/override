"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionLabel } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";

const VERDICT_ORDER = ["true", "false", "misleading", "unverified"];
const LANGUAGE_LABELS = { ms: "BM", en: "EN", zh: "中文" };

// The interactions feed is the admin's live view of what's happening on the
// platform, so it refreshes on its own rather than needing a reload.
const REFRESH_MS = 20_000;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const res = await fetch("/api/admin/stats", { signal });
      if (!res.ok) throw new Error("failed");
      setStats(await res.json());
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      if (err?.name !== "AbortError") setError("Couldn't load dashboard stats.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Not a synchronous setState: `load` awaits the fetch before it ever
    // touches state. The rule can't follow that across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal);
    const timer = setInterval(() => load(controller.signal), REFRESH_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [load]);

  if (error && !stats) return <p className="text-danger">{error}</p>;
  if (!stats) return <p className="text-muted">Loading…</p>;

  const flagged = stats.verdictBreakdown.false + stats.verdictBreakdown.misleading;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Dashboard</h1>
          {updatedAt && (
            <span className="label-tracked text-[10px] text-faint">
              Updated {updatedAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Two up on a phone, four across from sm — these are single numbers,
            so they tile rather than needing their own rows. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={stats.totalToday} label="Checks today" />
          <StatCard value={stats.totalAllTime} label="Checks all-time" />
          <StatCard
            value={stats.activeSourceCount}
            label="Trusted sources"
            tone={stats.activeSourceCount === 0 ? "caution" : "default"}
            href="/admin/sources"
          />
          <StatCard value={flagged} label="Flagged false/misleading" tone="danger" />
        </div>

        {stats.activeSourceCount === 0 && (
          <Card className="mt-3 border-caution bg-caution-softer">
            <p className="text-sm leading-relaxed">
              There are no trusted sources yet, so every check will come back{" "}
              <strong>unverified</strong> — the model is instructed never to guess without
              one.{" "}
              <Link href="/admin/sources" className="text-accent underline">
                Add your first source
              </Link>
              .
            </p>
          </Card>
        )}
      </div>

      <div>
        <SectionLabel className="mb-2">Verdict breakdown</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {VERDICT_ORDER.map((v) => (
            <Card key={v} className="flex items-center justify-between gap-2">
              <VerdictBadge verdict={v} />
              <span className="font-display text-lg font-semibold">
                {stats.verdictBreakdown[v] ?? 0}
              </span>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionLabel>Recent user interactions</SectionLabel>
          <Link
            href="/admin/claims"
            className="label-tracked text-[10px] text-accent hover:underline"
          >
            Full claims log →
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {stats.recentInteractions.length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-muted">No checks yet.</p>
            </Card>
          )}
          {stats.recentInteractions.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 py-3">
              <VerdictBadge verdict={r.verdict} />
              <span className="min-w-0 flex-1 truncate text-sm">{r.text}</span>
              <span className="label-tracked hidden shrink-0 text-[10px] text-faint sm:inline">
                {LANGUAGE_LABELS[r.language] || r.language}
              </span>
              <span className="label-tracked shrink-0 text-[10px] text-muted">
                {new Date(r.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const STAT_TONES = {
  default: "text-foreground",
  danger: "text-danger",
  caution: "text-caution",
};

function StatCard({ value, label, tone = "default", href }) {
  const content = (
    <Card className="h-full text-center transition-colors hover:border-border-strong">
      <p className={`font-display text-2xl font-semibold sm:text-3xl ${STAT_TONES[tone]}`}>
        {value}
      </p>
      <p className="label-tracked mt-1 text-[10px] text-muted">{label}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
