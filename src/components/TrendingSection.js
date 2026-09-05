"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";

// "Trending right now" — surfaces claims that either (a) enough distinct
// people asked about recently that the auto-FAQ clustering flagged them, or
// (b) an admin manually featured. This is the Gen-Z-facing hook: a live feed
// of viral claims to browse, not just a blank box waiting for you to paste
// something in. See /api/trending and lib/autoFaq.js for how items get here.
export default function TrendingSection() {
  const router = useRouter();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trending")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show yet (no auto-clusters, nothing featured) — stay silent
  // rather than showing an awkward empty state on the homepage.
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--danger)" }}
        />
        <p className="label-tracked text-xs" style={{ color: "var(--muted)" }}>
          Trending right now
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/faq?q=${encodeURIComponent(item.title)}`)}
            className="text-left shrink-0 w-[240px] snap-start"
          >
            <Card raised className="h-full">
              <div className="flex items-center justify-between mb-2 gap-2">
                {item.verdict ? (
                  <VerdictBadge verdict={item.verdict} />
                ) : (
                  <span className="label-tracked text-[9px]" style={{ color: "var(--muted)" }}>
                    Unverified
                  </span>
                )}
                {item.clusterSize && (
                  <span className="label-tracked text-[9px] shrink-0" style={{ color: "var(--muted)" }}>
                    {item.clusterSize} asked
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{item.title}</p>
              <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>
                {item.exampleText || item.body}
              </p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
