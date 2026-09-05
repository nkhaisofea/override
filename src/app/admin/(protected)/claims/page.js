"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PillButton, SectionLabel } from "@/components/Card";
import { VerdictBadge, RiskBadge } from "@/components/StatusBadge";
import { ScoreMeter } from "@/components/ScoreMeter";

const VERDICTS = ["true", "false", "misleading", "unverified"];
const FILTERS = [
  { key: "all", label: "All" },
  { key: "overridden", label: "Overridden" },
  { key: "unverified", label: "Unverified" },
  { key: "high_risk", label: "High risk" },
];

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [overrideVerdict, setOverrideVerdict] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/claims?limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setClaims)
      .catch(() => setError("Couldn't load claims."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleExpand(c) {
    if (expandedId === c.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(c.id);
    setOverrideVerdict(c.verdict);
    setOverrideNote(c.overrideNote || "");
    setSaveError("");
  }

  async function handleOverride(id) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: overrideVerdict, overrideNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Something went wrong.");
        return;
      }
      setExpandedId(null);
      load();
    } catch {
      setSaveError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const visible = (claims || []).filter((c) => {
    if (filter === "overridden") return !!c.overriddenBy;
    if (filter === "unverified") return c.verdict === "unverified";
    if (filter === "high_risk") return c.riskLevel === "high_risk";
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">Claims log</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Every check the AI has run. Override a verdict if the AI got it wrong — this is the
          human safety net.
        </p>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`label-tracked shrink-0 rounded-full border px-3 py-1.5 text-[10px] transition-colors ${
              filter === f.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger">{error}</p>}
      {!claims && !error && <p className="text-muted">Loading…</p>}
      {claims && visible.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted">
            {claims.length === 0 ? "No checks yet." : "Nothing matches this filter."}
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((c) => {
          const expanded = expandedId === c.id;
          return (
            <Card key={c.id}>
              <button
                className="w-full text-left"
                onClick={() => toggleExpand(c)}
                aria-expanded={expanded}
              >
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                  <VerdictBadge verdict={c.verdict} />
                  {c.overriddenBy && (
                    <span className="label-tracked shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] text-accent">
                      Overridden
                    </span>
                  )}
                  <span className="w-full min-w-0 flex-1 truncate text-sm sm:w-auto">
                    {c.claim || c.text}
                  </span>
                  <span className="label-tracked shrink-0 text-[10px] text-muted">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <span className="shrink-0 text-muted" aria-hidden="true">
                    {expanded ? "▾" : "›"}
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                  <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                    <div className="flex flex-col gap-4">
                      <div>
                        <SectionLabel className="mb-1">Original message</SectionLabel>
                        <p className="text-sm leading-relaxed">{c.text}</p>
                      </div>
                      <div>
                        <SectionLabel className="mb-1">AI explanation</SectionLabel>
                        <p className="text-sm leading-relaxed text-muted">{c.explanation}</p>
                      </div>
                      {c.sourceCitation && (
                        <div>
                          <SectionLabel className="mb-1">Cited source</SectionLabel>
                          <p className="text-sm">{c.sourceCitation.title}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-4 lg:mt-0">
                      {(c.evidenceConfidence != null || c.actionRisk != null) && (
                        <div className="flex flex-col gap-3">
                          <ScoreMeter
                            label="Evidence confidence"
                            value={c.evidenceConfidence}
                            tone="accent"
                          />
                          <ScoreMeter label="Action risk" value={c.actionRisk} tone="danger" />
                          <div className="flex items-center gap-2">
                            <span className="label-tracked text-[10px] text-muted">
                              Resulting risk
                            </span>
                            <RiskBadge riskLevel={c.riskLevel} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <SectionLabel tone="accent" className="mb-2">
                      Override verdict
                    </SectionLabel>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {VERDICTS.map((v) => (
                        <button
                          key={v}
                          onClick={() => setOverrideVerdict(v)}
                          aria-pressed={overrideVerdict === v}
                          className={`label-tracked rounded-full border px-3 py-2 text-[10px] transition-colors ${
                            overrideVerdict === v
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-border text-muted hover:border-border-strong hover:text-foreground"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Override note (optional) — why was this changed?"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      className="field mb-3 resize-y"
                    />
                    <p className="mb-3 text-[11px] leading-relaxed text-faint">
                      The risk level is recalculated from the new verdict and this claim&apos;s
                      existing action-risk score.
                    </p>
                    {saveError && (
                      <p className="mb-2 text-xs text-danger" role="alert">
                        {saveError}
                      </p>
                    )}
                    <PillButton onClick={() => handleOverride(c.id)} disabled={saving}>
                      {saving ? "Saving…" : "Save override"}
                    </PillButton>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
