"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InteractiveCard, SectionLabel } from "@/components/Card";
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
    const controller = new AbortController();
    fetch("/api/trending", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {
        // Aborted on unmount, or the feed is unavailable — either way the
        // section just stays hidden. Nothing here is worth an error state.
        if (!controller.signal.aborted) setItems([]);
      });
    return () => controller.abort();
  }, []);

  // Nothing to show yet (no auto-clusters, nothing featured) — stay silent
  // rather than showing an awkward empty state.
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
        <SectionLabel>Trending right now</SectionLabel>
      </div>

      {/* Mobile: a horizontal snap rail that bleeds to the screen edges.
          Laptop: a plain stack in the sidebar, where there's vertical room and
          a sideways scroller would be the wrong affordance. */}
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => (
          <InteractiveCard
            key={item.id}
            as="button"
            type="button"
            raised
            onClick={() =>
              router.push(
                item.topicTag
                  ? `/faq?tag=${encodeURIComponent(item.topicTag)}`
                  : `/faq?q=${encodeURIComponent(item.title)}`
              )
            }
            className="w-60 shrink-0 snap-start lg:w-full lg:shrink"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              {item.verdict ? (
                <VerdictBadge verdict={item.verdict} />
              ) : (
                <span className="label-tracked text-[9px] text-muted">Unverified</span>
              )}
              {item.clusterSize > 0 && (
                <span className="label-tracked shrink-0 text-[9px] text-muted">
                  {item.clusterSize} asked
                </span>
              )}
            </div>
            <p className="mb-1 line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted">
              {item.exampleText || item.body}
            </p>
          </InteractiveCard>
        ))}
      </div>
    </section>
  );
}
