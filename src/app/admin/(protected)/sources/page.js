"use client";

import { useEffect, useState } from "react";
import { Card, PillButton } from "@/components/Card";

const EMPTY_FORM = { title: "", text: "", url: "" };

export default function AdminSourcesPage() {
  const [sources, setSources] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    fetch("/api/admin/sources")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setSources)
      .catch(() => setError("Couldn't load sources."));
  }

  useEffect(load, []);

  function startEdit(s) {
    setEditingId(s.id);
    setForm({ title: s.title, text: s.text, url: s.url || "" });
    setFormError("");
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
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Trusted sources</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          These are what the AI grounds its verdicts in. Add authoritative content (MOH, WHO,
          medical bodies) — the more coverage, the fewer &quot;unverified&quot; results.
        </p>
      </div>

      <Card raised>
        <p className="label-tracked text-xs mb-3" style={{ color: "var(--accent)" }}>
          {editingId ? "Edit source" : "Add a source"}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder="Title (e.g. MOH: Dengue prevention guidance)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <textarea
            required
            rows={5}
            placeholder="Paste the trusted content here — this is what gets matched and cited."
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            className="w-full resize-none rounded-2xl border border-border bg-transparent p-4 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <input
            placeholder="Source URL (optional)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          {formError && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
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
        </form>
      </Card>

      <div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!sources && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        {sources && sources.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No sources yet — add your first one above.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {sources?.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                    {s.text}
                  </p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline mt-1 inline-block"
                      style={{ color: "var(--accent)" }}
                    >
                      {s.url}
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className="label-tracked text-[10px]"
                    style={{ color: "var(--accent)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="label-tracked text-[10px]"
                    style={{ color: "var(--danger)" }}
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
  );
}
