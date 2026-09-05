"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, LivePulse } from "@/components/Logo";
import { Card, InteractiveCard, PillButton, SectionLabel } from "@/components/Card";
import { StatusDot, RISK_CONFIG, VERDICT_CONFIG } from "@/components/StatusBadge";
import TrendingSection from "@/components/TrendingSection";
import { useSpeechInput } from "@/lib/useSpeechInput";
import {
  getSessionId,
  getHistory,
  addToHistory,
  getPortfolioCounts,
} from "@/lib/clientHistory";

const LANGUAGES = [
  { code: "ms", label: "Bahasa Melayu", short: "BM" },
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "中文", short: "中文" },
];

// Submit button copy per language — the button is the one control that has to
// read natively, since it's the moment the user commits.
const SUBMIT_LABEL = { ms: "Semak sekarang", en: "Check now", zh: "立即查证" };
const PLACEHOLDER = {
  ms: "Tampal mesej, siaran, atau dakwaan yang anda mahu semak…",
  en: "Paste the forwarded message, post, or claim you want to check…",
  zh: "粘贴你想查证的转发消息、帖子或说法…",
};

const MAX_SCAN_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone screenshot
const MAX_CLAIM_LENGTH = 2000;

const RISK_ORDER = ["safe", "caution", "high_risk"];

export default function HomePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [history, setHistory] = useState([]);
  const [portfolio, setPortfolio] = useState({ safe: 0, caution: 0, high_risk: 0 });

  const textareaRef = useRef(null);

  // Voice input appends to whatever is already in the box, so a user can
  // dictate, then correct a word by hand.
  const speech = useSpeechInput({
    language,
    onResult: (transcript) => {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript).slice(0, MAX_CLAIM_LENGTH));
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    // Intentional: localStorage is only readable client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch on the
    // server-rendered pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getHistory());
    setPortfolio(getPortfolioCounts());
  }, []);

  function goToResult(data) {
    addToHistory({
      id: data.id,
      claim: data.claim,
      verdict: data.verdict,
      riskLevel: data.riskLevel,
      createdAt: new Date().toISOString(),
    });
    router.push(`/result/${data.id}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    if (speech.listening) speech.stop();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/claims/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      goToResult(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleScanFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || scanLoading) return;

    setScanError("");
    if (!file.type.startsWith("image/")) {
      setScanError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_SCAN_BYTES) {
      setScanError("That image is too large — try a smaller screenshot.");
      return;
    }

    setScanLoading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setScanError("Couldn't read that file. Please try again.");
      setScanLoading(false);
    };
    reader.onload = async () => {
      try {
        // reader.result is "data:image/png;base64,AAAA..." — strip the prefix.
        const imageBase64 = String(reader.result).split(",")[1] || "";
        const res = await fetch("/api/claims/check-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            mimeType: file.type,
            language,
            sessionId: getSessionId(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setScanError(data.error || "Something went wrong. Please try again.");
          return;
        }
        goToResult(data);
      } catch {
        setScanError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setScanLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    // Mobile-first: one narrow column. From lg the same content becomes a
    // two-column workspace — the check composer stays the focus on the left,
    // and everything ambient (portfolio, trending, history) moves into a
    // sticky rail on the right instead of being buried below the fold.
    <main className="aura mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-xl sm:px-8 lg:max-w-6xl lg:pt-12">
      <header className="mb-8 flex items-center justify-between lg:mb-12">
        <Logo />
        <div className="flex items-center gap-4">
          <Link
            href="/faq"
            className="label-tracked hidden text-[11px] text-muted transition-colors hover:text-accent sm:block"
          >
            Health FAQs
          </Link>
          <LivePulse />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* ---------------- Left column: the check flow ---------------- */}
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Your health reality layer
          </h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-muted sm:text-base lg:mb-8">
            What did you receive? Check it before you trust, act, or share.
          </p>

          {/* Reality Scan — the large accent-filled primary action from the
              reference design. A styled <label> wrapping a visually hidden
              file input, so it stays a real form control for keyboard and
              screen-reader users. */}
          <label
            className={`group relative mb-3 block cursor-pointer rounded-3xl bg-accent p-5 text-on-accent transition-transform focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:p-6 ${
              scanLoading ? "opacity-70" : "active:scale-[0.99]"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleScanFile}
              disabled={scanLoading}
              className="sr-only"
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="label-tracked text-xs opacity-70">Reality Scan</p>
                <p className="mt-1.5 font-display text-xl font-semibold sm:text-2xl">
                  {scanLoading ? "Reading screenshot…" : "Scan a screenshot"}
                </p>
                <p className="mt-1 text-xs opacity-80 sm:text-sm">
                  Upload a poster or forward — we&apos;ll read the claim out of it.
                </p>
              </div>
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-on-accent/10 text-xl transition-transform group-hover:scale-110"
              >
                {scanLoading ? "◌" : "⌁"}
              </span>
            </div>
          </label>
          {scanError && (
            <p className="mb-3 text-xs text-danger" role="alert">
              {scanError}
            </p>
          )}

          {/* Secondary actions */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <InteractiveCard
              as="button"
              type="button"
              onClick={speech.supported ? speech.toggle : undefined}
              disabled={!speech.supported}
              aria-pressed={speech.listening}
              className={`py-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                speech.listening ? "border-accent bg-accent-soft" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block size-2 rounded-full ${
                    speech.listening ? "animate-pulse bg-danger" : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
                <p className="label-tracked text-xs text-accent">Ask Vitaura</p>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-muted">
                {!speech.supported
                  ? "Voice needs Chrome, Edge, or Safari"
                  : speech.listening
                  ? "Listening… tap to stop"
                  : "Speak the claim instead"}
              </p>
            </InteractiveCard>

            <InteractiveCard
              as="button"
              type="button"
              onClick={() => textareaRef.current?.focus()}
              className="py-4"
            >
              <p className="label-tracked text-xs text-accent">Paste a message</p>
              <p className="mt-1.5 text-xs leading-snug text-muted">
                Type or paste the text you received
              </p>
            </InteractiveCard>
          </div>

          {/* The composer — the must-have flow, always visible rather than
              hidden behind one of the cards above. */}
          <Card raised className="border-accent/40">
            <form onSubmit={handleSubmit}>
              <label htmlFor="claim-input" className="sr-only">
                The health claim you want to check
              </label>
              <textarea
                id="claim-input"
                ref={textareaRef}
                value={speech.interim ? `${text} ${speech.interim}`.trim() : text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER[language]}
                rows={5}
                maxLength={MAX_CLAIM_LENGTH}
                className="field resize-y min-h-32 lg:min-h-40"
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="label-tracked text-[10px] text-faint">
                  {speech.listening ? "Listening…" : `${text.length} / ${MAX_CLAIM_LENGTH}`}
                </span>
                {text && (
                  <button
                    type="button"
                    onClick={() => setText("")}
                    className="label-tracked text-[10px] text-faint transition-colors hover:text-danger"
                  >
                    Clear
                  </button>
                )}
              </div>

              <fieldset className="mt-3 mb-4">
                <legend className="sr-only">Answer language</legend>
                <div className="flex gap-2">
                  {LANGUAGES.map((l) => {
                    const active = language === l.code;
                    return (
                      <button
                        type="button"
                        key={l.code}
                        onClick={() => setLanguage(l.code)}
                        aria-pressed={active}
                        className={`label-tracked flex-1 rounded-full border px-2 py-2.5 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-transparent text-muted hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        <span className="sm:hidden">{l.short}</span>
                        <span className="hidden sm:inline">{l.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {(error || speech.error) && (
                <p className="mb-3 text-xs text-danger" role="alert">
                  {error || speech.error}
                </p>
              )}

              <PillButton
                type="submit"
                disabled={!text.trim() || loading}
                className="w-full"
              >
                {loading ? "Checking…" : SUBMIT_LABEL[language]}
              </PillButton>
            </form>
          </Card>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            Vitaura checks claims against trusted sources. It isn&apos;t medical advice —
            for anything about your own health, talk to a clinician.
          </p>
        </div>

        {/* ---------------- Right column: ambient context ---------------- */}
        <aside className="mt-10 lg:sticky lg:top-12 lg:mt-0">
          <SectionLabel className="mb-2">Risk portfolio</SectionLabel>
          <div className="mb-8 grid grid-cols-3 gap-3">
            {RISK_ORDER.map((key) => (
              <Card key={key} className="p-4 text-center">
                <p className={`font-display text-2xl font-semibold sm:text-3xl ${RISK_CONFIG[key].text}`}>
                  {portfolio[key]}
                </p>
                <p className="label-tracked mt-1 text-[10px] text-muted">
                  {RISK_CONFIG[key].label}
                </p>
              </Card>
            ))}
          </div>

          <TrendingSection />

          {history.length > 0 ? (
            <>
              <SectionLabel className="mb-2">Recent checks</SectionLabel>
              <div className="flex flex-col gap-2">
                {history.slice(0, 10).map((item) => (
                  <InteractiveCard
                    key={item.id}
                    as="button"
                    type="button"
                    onClick={() => router.push(`/result/${item.id}`)}
                    className="flex items-center gap-3 py-3"
                  >
                    <StatusDot riskLevel={item.riskLevel} />
                    <span className="min-w-0 flex-1 truncate text-sm">{item.claim}</span>
                    <span className="label-tracked shrink-0 text-[10px] text-muted">
                      {RISK_CONFIG[item.riskLevel]?.label} ·{" "}
                      {VERDICT_CONFIG[item.verdict]?.label}
                    </span>
                    <span className="text-muted" aria-hidden="true">
                      ›
                    </span>
                  </InteractiveCard>
                ))}
              </div>
            </>
          ) : (
            <Card className="text-center">
              <p className="text-xs leading-relaxed text-muted">
                Your checks appear here — private to this device, no account needed.
              </p>
            </Card>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/faq" className="text-xs text-muted underline">
              Browse health FAQs
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
