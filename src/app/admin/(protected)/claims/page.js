"use client";

import { useEffect, useState } from "react";
import { Card, PillButton } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";
import { ScoreMeter } from "@/components/ScoreMeter";

const VERDICTS = ["true", "false", "misleading", "unverified"];

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [overrideVerdict, setOverrideVerdict] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function load() {
    fetch("/api/admin/claims?limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setClaims)
      .catch(() => setError("Couldn't load claims."));
  }

  useEffect(load, []);

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Claims log</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Every check the AI has run. Override a verdict if the AI got it wrong — this is the
          human safety net.
        </p>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {!claims && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {claims && claims.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No checks yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {claims?.map((c) => (
          <Card key={c.id}>
            <button className="w-full text-left" onClick={() => toggleExpand(c)}>
              <div className="flex items-center gap-3">
                <VerdictBadge verdict={c.verdict} />
                {c.overriddenBy && (
                  <span
                    className="label-tracked text-[9px] rounded-full px-2 py-0.5"
                    style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
                  >
                    Overridden
                  </span>
                )}
                <span className="flex-1 text-sm truncate">{c.claim || c.text}</span>
                <span className="label-tracked text-[10px] shrink-0" style={{ color: "var(--muted)" }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>

            {expandedId === c.id && (
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                <div>
                  <p className="label-tracked text-[10px] mb-1" style={{ color: "var(--muted)" }}>
                    Original message
                  </p>
                  <p className="text-sm">{c.text}</p>
                </div>
                {(c.evidenceConfidence != null || c.actionRisk != null) && (
                  <div className="grid grid-cols-2 gap-4">
                    <ScoreMeter label="Evidence confidence" value={c.evidenceConfidence} color="var(--accent)" />
                    <ScoreMeter label="Action risk" value={c.actionRisk} color="var(--danger)" />
                  </div>
                )}
                <div>
                  <p className="label-tracked text-[10px] mb-1" style={{ color: "var(--muted)" }}>
                    AI explanation
                  </p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {c.explanation}
                  </p>
                </div>
                {c.sourceCitation && (
                  <div>
                    <p className="label-tracked text-[10px] mb-1" style={{ color: "var(--muted)" }}>
                      Cited source
                    </p>
                    <p className="text-sm">{c.sourceCitation.title}</p>
                  </div>
                )}

                <div>
                  <p className="label-tracked text-[10px] mb-2" style={{ color: "var(--accent)" }}>
                    Override verdict
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {VERDICTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setOverrideVerdict(v)}
                        className="label-tracked text-[10px] rounded-full px-3 py-2 border transition"
                        style={
                          overrideVerdict === v
                            ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                            : { background: "transparent", borderColor: "var(--border)", color: "var(--muted)" }
                        }
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
                    className="w-full resize-none rounded-2xl border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted focus:border-accent mb-3"
                  />
                  {saveError && (
                    <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>
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
        ))}
      </div>
    </div>
  );
}
