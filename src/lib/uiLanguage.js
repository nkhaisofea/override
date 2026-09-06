"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ui, t as resultStrings, SUPPORTED_LANGUAGES, UI_LANGUAGE_COOKIE } from "./i18n";

/**
 * The interface language — what the app's own chrome is written in.
 *
 * Deliberately separate from a result's answer language. That one belongs to
 * the claim and is translated by the model; this one belongs to the person,
 * persists across visits, and costs nothing. Someone may well want the
 * interface in Bahasa Melayu while reading a verdict about an English forward
 * exactly as it was written.
 *
 * Stored in a cookie rather than localStorage, on purpose. The root layout
 * reads the cookie on the server, so the first paint is already in the right
 * language. With localStorage the server cannot know the preference, so every
 * page load would flash English before correcting itself — confusing for
 * anyone who chose another language precisely because English is hard work.
 */

export { UI_LANGUAGE_COOKIE };

const UiLanguageContext = createContext(null);

export function UiLanguageProvider({ initialLanguage = "en", children }) {
  const [language, setLanguageState] = useState(
    SUPPORTED_LANGUAGES.includes(initialLanguage) ? initialLanguage : "en"
  );

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLanguageState(next);
    try {
      // One year, site-wide, lax. Not httpOnly — this is a display preference
      // the client itself sets; there is nothing to protect.
      document.cookie = `${UI_LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
    } catch {
      // Cookies disabled — the choice still applies for this page view.
    }
  }, []);

  // One string bag for the whole app.
  //
  // There were two tables — result-page copy and interface chrome — because
  // they used to be governed by two different language controls. Now a single
  // picker drives everything, so a component asking for `t.claimChecked` and
  // one asking for `t.healthFaqs` must both be served, and merging here is
  // what stops a page silently rendering `undefined` for half its labels.
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: { ...resultStrings(language), ...ui(language) },
    }),
    [language, setLanguage]
  );

  return (
    <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
  );
}

/**
 * @returns {{language: string, setLanguage: (code: string) => void, t: Record<string,string>}}
 */
export function useUiLanguage() {
  const ctx = useContext(UiLanguageContext);
  if (!ctx) {
    // Falling back rather than throwing keeps a component usable in isolation
    // (and keeps a missing provider from blanking the whole page).
    return { language: "en", setLanguage: () => {}, t: ui("en") };
  }
  return ctx;
}
