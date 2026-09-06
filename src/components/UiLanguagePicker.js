"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useUiLanguage } from "@/lib/uiLanguage";

/**
 * Switches the whole interface language.
 *
 * A dropdown rather than a row of pills: four pills in a page header crowds
 * out the logo on a phone, and this control is used once and then left alone,
 * so it should be small until it is needed.
 *
 * Sized for the audience. Every option is a 48px-tall row showing the language
 * in its own script — someone looking for Malay scans for "Bahasa Melayu", not
 * for a flag or a two-letter code they have to decode.
 */
export default function UiLanguagePicker({ className = "" }) {
  const { language, setLanguage, t } = useUiLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[1];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.interfaceLanguage}
        className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {/* Globe — the one icon people already read as "change language". */}
        <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <span className="font-medium">{current.short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.interfaceLanguage}
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-surface-raised py-1 shadow-2xl shadow-black/50"
        >
          {LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLanguage(l.code);
                    setOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-base transition-colors ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <span>{l.label}</span>
                  {active && (
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
