export const VERDICT_CONFIG = {
  true: { label: "TRUE", color: "var(--accent)", soft: "var(--accent-soft)" },
  false: { label: "FALSE", color: "var(--danger)", soft: "var(--danger-soft)" },
  misleading: { label: "MISLEADING", color: "var(--caution)", soft: "var(--caution-soft)" },
  unverified: { label: "UNVERIFIED", color: "var(--unverified)", soft: "var(--unverified-soft)" },
};

export const RISK_CONFIG = {
  safe: { label: "SAFE", color: "var(--accent)", soft: "var(--accent-soft)" },
  caution: { label: "CAUTION", color: "var(--caution)", soft: "var(--caution-soft)" },
  high_risk: { label: "HIGH RISK", color: "var(--danger)", soft: "var(--danger-soft)" },
};

export function VerdictBadge({ verdict, size = "md" }) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.unverified;
  const pad = size === "lg" ? "px-5 py-2 text-sm" : "px-3 py-1 text-xs";
  return (
    <span
      className={`label-tracked inline-flex items-center rounded-full ${pad}`}
      style={{ color: cfg.color, background: cfg.soft, border: `1px solid ${cfg.color}` }}
    >
      {cfg.label}
    </span>
  );
}

export function StatusDot({ riskLevel }) {
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.caution;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ background: cfg.color }}
      aria-hidden="true"
    />
  );
}
