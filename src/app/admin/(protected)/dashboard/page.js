"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";

const VERDICT_ORDER = ["true", "false", "misleading", "unverified"];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setStats)
      .catch(() => setError("Couldn't load dashboard stats."));
  }, []);

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }
  if (!stats) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold mb-4">Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center">
            <p className="font-display text-2xl font-semibold">{stats.totalToday}</p>
            <p className="label-tracked text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              Checks today
            </p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-semibold">{stats.totalAllTime}</p>
            <p className="label-tracked text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              Checks all-time
            </p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-semibold">{stats.activeSourceCount}</p>
            <p className="label-tracked text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              Trusted sources
            </p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-2xl font-semibold" style={{ color: "var(--danger)" }}>
              {stats.verdictBreakdown.false + stats.verdictBreakdown.misleading}
            </p>
            <p className="label-tracked text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              Flagged false/misleading
            </p>
          </Card>
        </div>
      </div>

      <div>
        <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
          Verdict breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VERDICT_ORDER.map((v) => (
            <Card key={v} className="flex items-center justify-between">
              <VerdictBadge verdict={v} />
              <span className="text-lg font-semibold">{stats.verdictBreakdown[v] ?? 0}</span>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="label-tracked text-xs mb-2" style={{ color: "var(--muted)" }}>
          Recent interactions
        </p>
        <div className="flex flex-col gap-2">
          {stats.recentInteractions.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No checks yet.
            </p>
          )}
          {stats.recentInteractions.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 py-3">
              <VerdictBadge verdict={r.verdict} />
              <span className="flex-1 text-sm truncate">{r.text}</span>
              <span className="label-tracked text-[10px] shrink-0" style={{ color: "var(--muted)" }}>
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
