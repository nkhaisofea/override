"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// "Ask Vitaura" — speak the claim instead of typing it.
//
// Uses the browser's built-in Web Speech API, so there's no audio upload, no
// extra API key, and no cost. The tradeoff is patchy support: it's solid in
// Chrome/Edge and Safari, absent in Firefox. `supported` is exposed so the UI
// can hide the affordance rather than offer a button that does nothing.
//
// This matters more than usual for Vitaura's audience: the people most likely
// to be forwarded health misinformation are often the least comfortable typing
// a long message into a phone, and dictating a claim in Malay or Mandarin is
// far faster than thumbing it in.

// BCP-47 tags for the three supported languages. The recogniser needs a
// region, not just a language — bare "ms" or "zh" is rejected or silently
// falls back to the browser locale.
const SPEECH_LOCALES = {
  ms: "ms-MY",
  en: "en-MY",
  zh: "zh-CN",
};

const ERROR_MESSAGES = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings to use voice.",
  "service-not-allowed":
    "Microphone access was blocked. Allow it in your browser settings to use voice.",
  "no-speech": "Didn't catch that — try speaking again.",
  "audio-capture": "No microphone found.",
  network: "Voice input needs a connection. Check your network and try again.",
  aborted: null, // user-initiated stop; not an error worth showing
};

// Feature detection has to survive server rendering: the server has no
// `window`, so a naive check would render one thing on the server and another
// on the client and trip a hydration mismatch. useSyncExternalStore is the
// sanctioned way to say "this value is false on the server, and read from the
// browser on the client" — the store never actually changes, so `subscribe`
// is a no-op unsubscriber.
const NOOP_SUBSCRIBE = () => () => {};
const getSupportedSnapshot = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const getServerSnapshot = () => false;

export function useSpeechInput({ language = "en", onResult } = {}) {
  const supported = useSyncExternalStore(
    NOOP_SUBSCRIBE,
    getSupportedSnapshot,
    getServerSnapshot
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  // Held in a ref so restarting the recogniser on a language change doesn't
  // need `onResult` in the effect's dependency list (it's usually an inline
  // arrow, which would re-run the effect — and tear down the recogniser
  // mid-sentence — on every render).
  const onResultRef = useRef(onResult);

  // Declared before the effect below so it has already run by the time a
  // recognition callback can fire.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!supported) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LOCALES[language] || SPEECH_LOCALES.en;
    recognition.continuous = false;
    // Interim results let the user see the transcript building, which is the
    // difference between "is this working?" and a usable control.
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        onResultRef.current?.(finalText.trim());
        setInterim("");
      }
    };

    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error];
      // `undefined` = unrecognised error code (show a generic message);
      // `null` = deliberately silent (e.g. the user aborted).
      if (message !== null) {
        setError(message ?? "Voice input didn't work. Try typing instead.");
      }
      setListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Already stopped — nothing to clean up.
      }
      recognitionRef.current = null;
    };
  }, [language, supported]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if it's already running — treat as a no-op.
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Not running.
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
