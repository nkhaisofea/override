"use client";

import { useEffect, useState } from "react";
import { Card, PillButton } from "@/components/Card";
import { VerdictBadge } from "@/components/StatusBadge";

const EMPTY_FORM = { title: "", body: "", sourceLink: "", topicTag: "", featured: false, verdict: "" };
const VERDICTS = ["true", "false", "misleading", "unverified"];

export default function AdminFaqPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    fetch("/api/admin/faq")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setPosts)
      .catch(() => setError("Couldn't load FAQ posts."));
  }

  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      body: p.body,
      sourceLink: p.sourceLink || "",
      topicTag: p.topicTag || "",
      featured: !!p.featured,
      verdict: p.verdict || "",
    });
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
      const url = editingId ? `/api/admin/faq/${editingId}` : "/api/admin/faq";
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
    if (!confirm("Delete this FAQ post?")) return;
    const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">FAQ</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Manually written posts, plus auto-generated drafts from claims multiple sessions
          asked about recently — review those before they read as official.
        </p>
      </div>

      <Card style={{ borderColor: "var(--caution)" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Posts marked <strong style={{ color: "var(--caution)" }}>Trending</strong> (auto or
          manually featured) show up in the &quot;Trending right now&quot; feed on the homepage.
          Use &quot;Feature as Trending&quot; below to manually spotlight a known viral claim —
          handy for a demo before real traffic triggers auto-clustering.
        </p>
      </Card>

      <Card raised>
        <p className="label-tracked text-xs mb-3" style={{ color: "var(--accent)" }}>
          {editingId ? "Edit post" : "Add a post"}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <textarea
            required
            rows={4}
            placeholder="Answer body"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full resize-none rounded-2xl border border-border bg-transparent p-4 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Topic tag (optional)"
              value={form.topicTag}
              onChange={(e) => setForm({ ...form, topicTag: e.target.value })}
              className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
            <input
              placeholder="Source link (optional)"
              value={form.sourceLink}
              onChange={(e) => setForm({ ...form, sourceLink: e.target.value })}
              className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          <div>
            <p className="label-tracked text-[10px] mb-2" style={{ color: "var(--muted)" }}>
              Verdict (optional — shows a badge on this post)
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setForm({ ...form, verdict: "" })}
                className="label-tracked text-[10px] rounded-full px-3 py-2 border transition"
                style={
                  !form.verdict
                    ? { background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--foreground)" }
                    : { background: "transparent", borderColor: "var(--border)", color: "var(--muted)" }
                }
              >
                none
              </button>
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, verdict: v })}
                  className="label-tracked text-[10px] rounded-full px-3 py-2 border transition"
                  style={
                    form.verdict === v
                      ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" }
                      : { background: "transparent", borderColor: "var(--border)", color: "var(--muted)" }
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4"
            />
            Feature as Trending on homepage
          </label>

          {formError && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <PillButton type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add post"}
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
        {!posts && !error && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        {posts && posts.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No FAQ posts yet.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {posts?.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.verdict && <VerdictBadge verdict={p.verdict} />}
                    {p.isAutoGenerated && (
                      <span
                        className="label-tracked text-[9px] rounded-full px-2 py-0.5"
                        style={{ color: "var(--caution)", background: "var(--caution-soft)" }}
                      >
                        Auto
                      </span>
                    )}
                    {p.featured && (
                      <span
                        className="label-tracked text-[9px] rounded-full px-2 py-0.5"
                        style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
                      >
                        Trending
                      </span>
                    )}
                    {p.clusterSize && (
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {p.clusterSize} asked
                      </span>
                    )}
                    {p.topicTag && (
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        #{p.topicTag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                    {p.body}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(p)}
                    className="label-tracked text-[10px]"
                    style={{ color: "var(--accent)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
