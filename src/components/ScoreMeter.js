// Horizontal meter for the two-axis risk model: Evidence Confidence (how
// strongly sources support the claim) and Action Risk (how dangerous acting
// on it would be). These are independent axes — see lib/gemini.js's system
// prompt for why a claim can score low on one and high on the other, and
// lib/risk.js for how they combine into the risk level.

const TONES = {
  accent: { text: "text-accent", bar: "bg-accent" },
  danger: { text: "text-danger", bar: "bg-danger" },
  caution: { text: "text-caution", bar: "bg-caution" },
};

export function ScoreMeter({ label, value, tone = "accent", description }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
  const cfg = TONES[tone] || TONES.accent;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="label-tracked text-[10px] text-muted">{label}</span>
        <span
          className={`font-display text-sm font-semibold ${pct === null ? "text-muted" : cfg.text}`}
        >
          {pct === null ? "—" : `${pct}%`}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
        role="meter"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {pct !== null && (
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {description && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p>
      )}
    </div>
  );
}
