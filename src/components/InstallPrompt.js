"use client";

import { useEffect, useState } from "react";
import { Card, PillButton } from "@/components/Card";
import { useUiLanguage } from "@/lib/uiLanguage";

// An in-page "install this app" card.
//
// Chrome/Edge on Android fire `beforeinstallprompt` and then show their own
// mini-infobar, which is easy to miss and easy to dismiss forever. Capturing
// the event lets the offer appear in the app's own voice, at a moment the
// user is already looking at the composer — and installing is what makes
// Vitaura reachable from the share sheet, which is how a forwarded message
// actually gets checked.
//
// iOS Safari never fires the event and has no programmatic install, so it gets
// the manual Share -> Add to Home Screen instruction instead. That branch is
// only shown on iOS and only when not already installed, because telling an
// Android user to tap a button that doesn't exist is worse than staying quiet.

const COPY = {
  ms: {
    title: "Pasang Vitaura",
    body: "Tambah ke skrin utama untuk semakan lebih pantas — dan kongsi mesej terus ke Vitaura.",
    install: "Pasang",
    later: "Nanti",
    ios: "Ketik Kongsi, kemudian “Tambah ke Skrin Utama”.",
  },
  en: {
    title: "Install Vitaura",
    body: "Add it to your home screen for faster checks — and share messages straight into Vitaura.",
    install: "Install",
    later: "Not now",
    ios: "Tap Share, then “Add to Home Screen”.",
  },
  zh: {
    title: "安装 Vitaura",
    body: "添加到主屏幕，查证更快 —— 还能直接把消息分享到 Vitaura。",
    install: "安装",
    later: "以后再说",
    ios: "点击“分享”，然后选择“添加到主屏幕”。",
  },
  ta: {
    title: "Vitaura-வை நிறுவுங்கள்",
    body: "விரைவான சரிபார்ப்புக்காக முகப்புத் திரையில் சேர்க்கவும் — செய்திகளை நேரடியாகப் பகிரலாம்.",
    install: "நிறுவு",
    later: "பிறகு",
    ios: "பகிர் என்பதைத் தட்டி, “முகப்புத் திரையில் சேர்” என்பதைத் தேர்ந்தெடுக்கவும்.",
  },
};

const DISMISSED_KEY = "vitaura_install_dismissed";

export default function InstallPrompt() {
  const { language } = useUiLanguage();
  const [deferred, setDeferred] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed: `standalone` is the modern signal, `navigator.standalone`
    // the iOS-only legacy one. Either way there is nothing to offer.
    const installed =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (installed) return;

    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Private mode / blocked storage — fall through and just show it.
    }

    const onPrompt = (e) => {
      // Suppress the browser's own infobar so there aren't two competing
      // install offers on screen at once.
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Hide the card the moment the install actually happens, even if it was
    // triggered from the browser menu rather than this button.
    const onInstalled = () => {
      setDeferred(null);
      setShowIosHint(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    // The user agent is a client-only value, so this can't be an initial
    // state value without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIos && isSafari) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setDeferred(null);
    setShowIosHint(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — worst case the card returns next visit.
    }
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    // The event can only be used once, whichever way the user answered.
    setDeferred(null);
  }

  if (!deferred && !showIosHint) return null;

  const copy = COPY[language] || COPY.en;

  return (
    <Card className="mb-4 p-4">
      <p className="mb-1 text-sm font-semibold">{copy.title}</p>
      <p className="text-sm leading-relaxed text-muted">{copy.body}</p>
      {deferred ? (
        <div className="mt-3 flex items-center gap-2">
          <PillButton type="button" onClick={install} className="min-h-11 px-5 text-sm">
            {copy.install}
          </PillButton>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 px-3 text-xs text-faint transition-colors hover:text-foreground"
          >
            {copy.later}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs leading-relaxed text-faint">{copy.ios}</p>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 shrink-0 px-3 text-xs text-faint transition-colors hover:text-foreground"
          >
            {copy.later}
          </button>
        </div>
      )}
    </Card>
  );
}
