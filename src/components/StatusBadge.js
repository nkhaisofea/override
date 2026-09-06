"use client";

import { useMemo } from "react";
import { verdictLabel, riskLabel } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/uiLanguage";

// Verdict and risk presentation.
//
// Class strings are written out in full rather than composed (`text-${color}`)
// because Tailwind scans source statically — an interpolated class name is
// never emitted into the stylesheet and silently renders unstyled.
//
// The colour config no longer carries the label text. Labels follow the
// interface language and come from lib/i18n.js, so a Malay page reads
// "RISIKO TINGGI" rather than an English "HIGH RISK" stamped on a translated
// card.

export const VERDICT_CONFIG = {
  true: {
    text: "text-accent",
    bg: "bg-accent-soft",
    border: "border-accent",
    dot: "bg-accent",
  },
  false: {
    text: "text-danger",
    bg: "bg-danger-soft",
    border: "border-danger",
    dot: "bg-danger",
  },
  misleading: {
    text: "text-caution",
    bg: "bg-caution-soft",
    border: "border-caution",
    dot: "bg-caution",
  },
  unverified: {
    text: "text-unverified",
    bg: "bg-unverified-soft",
    border: "border-unverified",
    dot: "bg-unverified",
  },
};

export const RISK_CONFIG = {
  safe: {
    text: "text-accent",
    bg: "bg-accent-soft",
    border: "border-accent",
    dot: "bg-accent",
  },
  caution: {
    text: "text-caution",
    bg: "bg-caution-soft",
    border: "border-caution",
    dot: "bg-caution",
  },
  high_risk: {
    text: "text-danger",
    bg: "bg-danger-soft",
    border: "border-danger",
    dot: "bg-danger",
  },
};

export function VerdictBadge({ verdict, size = "md", className = "" }) {
  const { language } = useUiLanguage();
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.unverified;
  const pad = size === "lg" ? "px-5 py-2 text-sm" : "px-3 py-1 text-[11px]";
  return (
    <span
      className={`label-tracked inline-flex shrink-0 items-center rounded-full border ${pad} ${cfg.text} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {verdictLabel(verdict, language)}
    </span>
  );
}

export function RiskBadge({ riskLevel, size = "md", className = "" }) {
  const { language } = useUiLanguage();
  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.caution;
  const pad = size === "lg" ? "px-5 py-2 text-sm" : "px-3 py-1 text-[11px]";
  return (
    <span
      className={`label-tracked inline-flex shrink-0 items-center rounded-full border ${pad} ${cfg.text} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {riskLabel(riskLevel, language)}
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

/**
 * Plain localised text, for places that need the word without a badge.
 *
 * Memoised on the language: callers put this in useMemo dependency arrays, and
 * a fresh object every render would invalidate their memo on every render —
 * quietly turning a cached filter into an uncached one.
 */
export function useStatusLabels() {
  const { language } = useUiLanguage();
  return useMemo(
    () => ({
      verdict: (v) => verdictLabel(v, language),
      risk: (r) => riskLabel(r, language),
    }),
    [language]
  );
}
