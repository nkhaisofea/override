"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, PillButton, SectionLabel } from "@/components/Card";

const EMPTY_FORM = { title: "", text: "", url: "", topicTags: "" };

export default function AdminSourcesPage() {
  const [sources, setSources] = useState(null);
  const [meta, setMeta] = useState({ needsReembed: 0, embeddingDimension: null });
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [reembedding, setReembedding] = useState(false);
  const [reembedResult, setReembedResult] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/sources")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setSources(data.sources || []);
        setMeta({
          needsReembed: data.needsReembed || 0,
          embeddingDimension: data.embeddingDimension,
        });
      })
      .catch(() => setError("Couldn't load sources."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      text: s.text,
      url: s.url || "",
      topicTags: (s.topicTags || []).join(", "),
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `/api/admin/sources/${editingId}` : "/api/admin/sources";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        // topicTags goes over as the raw comma-separated string; the server
        // normalises it (lib/tags.js) so the client can't invent tag formats.
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Something went wrong.");
        return;
      }
      cancelEdit();
      load();
    } catch {
      setFormError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this source? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function handleReembed() {
    if (reembedding) return;
    setReembedding(true);
    setReembedResult("");
    try {
      const res = await fetch("/api/admin/sources/reembed", { method: "POST" });
      const data = await res.json();
      setReembedResult(
        res.ok
          ? `Repaired ${data.repaired} of ${data.needed}.${data.failed ? ` ${data.failed} failed.` : ""}`
          : data.error || "Re-embed failed."
      );
      load();
    } catch {
      setReembedResult("Couldn't reach the server.");
    } finally {
      setReembedding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">Trusted sources</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          These are what the AI grounds its verdicts in. Add authoritative content (MOH, WHO,
          medical bodies) — the more coverage, the fewer &quot;unverified&quot; results.
        </p>
      </div>

      {/* A source with a missing or stale-dimension embedding is invisible to
          retrieval, and the only symptom is checks quietly returning
          "unverified". Surfaced loudly, with the one-click repair. */}
      {meta.needsReembed > 0 && (
        <Card className="border-caution bg-caution-softer">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label-tracked text-xs text-caution">Action needed</p>
              <p className="mt-1 text-sm leading-relaxed">
                {meta.needsReembed} source{meta.needsReembed === 1 ? "" : "s"} can&apos;t be
                matched right now — the embedding is missing or was built at a different
                dimension. They will never be cited until re-embedded.
              </p>
            </div>
            <PillButton onClick={handleReembed} disabled={reembedding} className="shrink-0">
              {reembedding ? "Re-embedding…" : "Re-embed all"}
            </PillButton>
          </div>
          {reembedResult && <p className="mt-3 text-xs text-muted">{reembedResult}</p>}
        </Card>
      )}

      {/* From lg the form pins to the left and the list scrolls beside it,
          so adding a batch of sources doesn't mean scrolling up each time. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start lg:gap-6">
        <Card raised className="lg:sticky lg:top-36">
          <SectionLabel tone="accent" className="mb-3">
            {editingId ? "Edit source" : "Add a source"}
          </SectionLabel>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              required
              placeholder="Title (e.g. MOH: Dengue prevention guidance)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field"
            />
            <textarea
              required
              rows={6}
              placeholder="Paste the trusted content here — this is what gets matched and cited."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="field resize-y"
            />
            <input
              type="url"
              placeholder="Source URL (optional)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="field"
            />
            <div>
              <input
                placeholder="Topic tags, comma separated (e.g. dengue, prevention)"
                value={form.topicTags}
                onChange={(e) => setForm({ ...form, topicTags: e.target.value })}
                className="field"
              />
              <p className="mt-1.5 text-[11px] text-faint">
                Tags carry through to auto-generated FAQ posts and the public topic filter.
              </p>
            </div>

            {formError && (
              <p className="text-xs text-danger" role="alert">
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <PillButton type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add source"}
              </PillButton>
              {editingId && (
                <PillButton type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </PillButton>
              )}
            </div>
            {!editingId && (
              <p className="text-[11px] leading-relaxed text-faint">
                Saving embeds the text immediately, so it&apos;s usable for matching straight
                away — no reindex step.
              </p>
            )}
          </form>
        </Card>

        <div className="mt-6 lg:mt-0">
          {error && <p className="text-danger">{error}</p>}
          {!sources && !error && <p className="text-muted">Loading…</p>}
          {sources && sources.length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-muted">No sources yet — add your first one.</p>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {sources?.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      {!s.embedded && (
                        <span className="label-tracked shrink-0 rounded-full bg-caution-soft px-2 py-0.5 text-[9px] text-caution">
                          Not indexed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                      {s.text}
                    </p>
                    {s.topicTags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.topicTags.map((tag) => (
                          <span
                            key={tag}
                            className="label-tracked rounded-full bg-surface-raised px-2 py-0.5 text-[9px] text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block truncate text-xs text-accent underline"
                      >
                        {s.url}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => startEdit(s)}
                      className="label-tracked text-[10px] text-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="label-tracked text-[10px] text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
