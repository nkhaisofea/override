"use client";

import { useEffect, useState } from "react";
import { useUiLanguage } from "./uiLanguage";

/**
 * Translates a list of FAQ entries into the interface language.
 *
 * Shared by the public FAQ page and the homepage trending rail, which show the
 * same underlying posts and so must not disagree about what language they're
 * in. Returns a `localise(post)` helper rather than a mutated list, so callers
 * keep their own ordering, filtering and keys.
 *
 * Everything degrades to the original wording: if the request fails, or the
 * daily model quota is exhausted, the reader still sees a correct answer in
 * the language it was written in. That is a far better outcome than an empty
 * page, so a failure here is deliberately silent.
 */
export function useFaqTranslations(posts) {
  const { language } = useUiLanguage();
  const [map, setMap] = useState({});

  // Stable identity for the effect: the set of ids plus the language. Using
  // the array itself would refetch on every render, since the FAQ page builds
  // a new array each time it fetches.
  const ids = (posts || []).map((p) => p.id).filter(Boolean);
  const key = `${language}:${ids.join(",")}`;

  useEffect(() => {
    if (ids.length === 0) return;

    let cancelled = false;
    fetch("/api/faq/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, ids }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data?.translations) {
          setMap((prev) => ({ ...prev, ...data.translations }));
        }
      })
      .catch(() => {
        // Silent by design — see the note above.
      });

    return () => {
      cancelled = true;
    };
    // `key` encodes both dependencies; `ids` and `language` are read from the
    // closure and are consistent with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    language,
    localise: (post) => {
      const tr = post?.id ? map[post.id] : null;
      if (!tr) return post;
      return { ...post, title: tr.title || post.title, body: tr.body || post.body };
    },
  };
}
