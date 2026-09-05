// Horizontal meter for the two-axis risk model: Evidence Confidence (how
// strongly sources support the claim) and Action Risk (how dangerous acting
// on it would be). These are independent axes — see lib/gemini.js's system
// prompt for why a claim can score low on one and high on the other.
export function ScoreMeter({ label, value, color, description }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="label-tracked text-[10px]" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span
          className="font-display text-sm font-semibold"
          style={{ color: pct === null ? "var(--muted)" : color }}
        >
          {pct === null ? "—" : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
        {pct !== null && (
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        )}
      </div>
      {description && (
        <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}
