// Verdict and risk presentation.
//
// Class strings are written out in full rather than composed (`text-${color}`)
// because Tailwind scans source statically — an interpolated class name is
// never emitted into the stylesheet and silently renders unstyled.

export const VERDICT_CONFIG = {
  true: {
    label: "TRUE",
    text: "text-accent",
    bg: "bg-accent-soft",
    border: "border-accent",
    dot: "bg-accent",
  },
  false: {
    label: "FALSE",
    text: "text-danger",
    bg: "bg-danger-soft",
    border: "border-danger",
    dot: "bg-danger",
  },
  misleading: {
    label: "MISLEADING",
    text: "text-caution",
    bg: "bg-caution-soft",
    border: "border-caution",
    dot: "bg-caution",
  },
  unverified: {
    label: "UNVERIFIED",
    text: "text-unverified",
    bg: "bg-unverified-soft",
    border: "border-unverified",
    dot: "bg-unverified",
  },
};

export const RISK_CONFIG = {
  safe: {
    label: "SAFE",
    text: "text-accent",
    bg: "bg-accent-soft",
    border: "border-accent",
    dot: "bg-accent",
  },
  caution: {
    label: "CAUTION",
    text: "text-caution",
    bg: "bg-caution-soft",
    border: "border-caution",
    dot: "bg-caution",
  },
  high_risk: {
    label: "HIGH RISK",
    text: "text-danger",
    bg: "bg-danger-soft",
    border: "border-danger",
    dot: "bg-danger",
  },
};

export function VerdictBadge({ verdict, size = "md", className = "" }) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.unverified;
  const pad = size === "lg" ? "px-5 py-2 text-sm" : "px-3 py-1 text-[11px]";
  return (
    <span
      className={`label-tracked inline-flex shrink-0 items-center rounded-full border ${pad} ${cfg.text} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
}

export function RiskBadge({ riskLevel, size = "md", className = "" }) {
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.caution;
  const pad = size === "lg" ? "px-5 py-2 text-sm" : "px-3 py-1 text-[11px]";
  return (
    <span
      className={`label-tracked inline-flex shrink-0 items-center rounded-full border ${pad} ${cfg.text} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
}

export function StatusDot({ riskLevel, className = "" }) {
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.caution;
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${cfg.dot} ${className}`}
      aria-hidden="true"
    />
  );
}
