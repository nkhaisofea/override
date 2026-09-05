"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";

export default function FaqPage() {
  return (
    // useSearchParams needs a Suspense boundary — lets a trending card on the
    // homepage deep-link here as /faq?tag=<topic> and land pre-filtered.
    <Suspense fallback={<FaqSkeleton />}>
      <FaqPageInner />
    </Suspense>
  );
}

function FaqSkeleton() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-3xl sm:px-8">
      <Logo href="/" className="mb-8" />
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
    </main>
  );
}

function FaqPageInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState({ posts: [], tags: [] });
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTag, setActiveTag] = useState(searchParams.get("tag") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    // Intentional: reset loading before each (re-)fetch triggered by the
    // query/tag changing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    // Debounced, so typing a search term doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeTag) params.set("tag", activeTag);

      fetch(`/api/faq?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setData({
            posts: Array.isArray(json.posts) ? json.posts : [],
            tags: Array.isArray(json.tags) ? json.tags : [],
          });
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, activeTag]);

  const { posts, tags } = data;

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-3xl sm:px-8 lg:max-w-5xl lg:pt-12">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/"
          className="label-tracked text-[11px] text-muted transition-colors hover:text-accent"
        >
          Check a claim
        </Link>
      </header>

      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
        Health FAQs
      </h1>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-muted">
        Claims checked so often we&apos;ve turned them into quick answers.
      </p>

      <div className="mb-4">
        <label htmlFor="faq-search" className="sr-only">
          Search health FAQs
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics…"
          className="field rounded-full"
        />
      </div>

      {/* Topic filter chips — only rendered for tags that actually have
          entries behind them (the API returns the distinct set). */}
      {tags.length > 0 && (
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={!activeTag} onClick={() => setActiveTag("")}>
            All
          </FilterChip>
          {tags.map((tag) => (
            <FilterChip
              key={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
            >
              #{tag}
            </FilterChip>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}

      {!loading && posts.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">
            {query || activeTag
              ? "No FAQs match that. Try a different search or topic."
              : "No FAQ entries yet — check back soon."}
          </p>
          {(query || activeTag) && (
            <PillButton
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setActiveTag("");
              }}
            >
              Clear filters
            </PillButton>
          )}
        </Card>
      )}

      {/* One column on a phone, two from md — FAQ entries are short and
          independent, so they tile well once there's width for it. */}
      <div className="grid gap-3 md:grid-cols-2">
        {posts.map((post) => (
          <Card key={post.id} className="flex flex-col">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="text-sm leading-snug font-semibold">{post.title}</h2>
              <div className="flex shrink-0 items-center gap-1">
                {post.verdict && <VerdictBadge verdict={post.verdict} />}
              </div>
            </div>
            <p className="mb-3 flex-1 text-xs leading-relaxed text-muted">{post.body}</p>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
              <div className="flex min-w-0 items-center gap-2">
                {post.topicTag && (
                  <button
                    type="button"
                    onClick={() => setActiveTag(post.topicTag)}
                    className="truncate transition-colors hover:text-accent"
                  >
                    #{post.topicTag}
                  </button>
                )}
                {post.isAutoGenerated && (
                  // Labelled honestly: this entry was drafted automatically
                  // because enough people asked, not written by a person.
                  <span
                    className="label-tracked shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] text-accent"
                    title={
                      post.clusterSize
                        ? `Auto-drafted after ${post.clusterSize} people asked about this`
                        : "Auto-drafted from repeated questions"
                    }
                  >
                    Auto
                  </span>
                )}
              </div>
              {post.sourceLink && (
                <a
                  href={post.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-accent hover:underline"
                >
                  Source ↗
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label-tracked shrink-0 rounded-full border px-3 py-1.5 text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-muted hover:border-border-strong hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
