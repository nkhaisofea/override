"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, LivePulse } from "@/components/Logo";
import { Card, InteractiveCard, PillButton, SectionLabel } from "@/components/Card";
import { StatusDot, RISK_CONFIG, useStatusLabels } from "@/components/StatusBadge";
import TrendingSection from "@/components/TrendingSection";
import UiLanguagePicker from "@/components/UiLanguagePicker";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { useUiLanguage } from "@/lib/uiLanguage";
import { FadeUp, Stagger, StaggerItem, Pressable, Glow, DELAY } from "@/components/motion";
import {
  getSessionId,
  getHistory,
  addToHistory,
  getPortfolioCounts,
} from "@/lib/clientHistory";

// Submit button copy per ANSWER language — the button is the one control that
// has to read natively, since it's the moment the user commits.
const SUBMIT_LABEL = {
  ms: "Semak sekarang",
  en: "Check now",
  zh: "立即查证",
  ta: "இப்போது சரிபார்",
};
const PLACEHOLDER = {
  ms: "Tampal mesej, siaran, atau dakwaan yang anda mahu semak…",
  en: "Paste the forwarded message, post, or claim you want to check…",
  zh: "粘贴你想查证的转发消息、帖子或说法…",
  ta: "நீங்கள் சரிபார்க்க விரும்பும் செய்தி அல்லது கூற்றை ஒட்டவும்…",
};

const MAX_SCAN_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone screenshot
const MAX_CLAIM_LENGTH = 2000;

const RISK_ORDER = ["safe", "caution", "high_risk"];

export default function HomePage() {
  const router = useRouter();
  // The check is answered in whatever language the interface is in. Asking
  // someone to pick a second language, one line below the language they just
  // picked, is a question with no good answer — and for this audience it is a
  // decision that adds nothing. The result page still lets them switch the
  // answer afterwards.
  const { t, language } = useUiLanguage();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [portfolio, setPortfolio] = useState({ safe: 0, caution: 0, high_risk: 0 });

  const textareaRef = useRef(null);
  const labels = useStatusLabels();

  // Searching recent checks matches the claim text AND the verdict/risk labels,
  // so "dengue", "false" and "high risk" are all useful queries — people
  // looking back through their history tend to remember the outcome ("what was
  // that one that came back false?") rather than the exact wording they pasted.
  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => {
      const verdict = labels.verdict(item.verdict);
      const risk = labels.risk(item.riskLevel);
      return `${item.claim} ${verdict} ${risk} ${item.riskLevel} ${item.verdict}`
        .toLowerCase()
        .includes(q);
    });
  }, [history, historyQuery, labels]);

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
      // The user's own wording, verbatim. Storing the model's extracted claim
      // here meant the history showed something the person never wrote.
      claim: data.text || data.claim,
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
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setScanError("Please choose an image or a PDF.");
      return;
    }
    if (file.size > MAX_SCAN_BYTES) {
      setScanError("That file is too large — try a smaller screenshot or document.");
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
    // two-column workspace — the composer stays the focus on the left, and
    // everything ambient (portfolio, trending, history) moves into a sticky
    // rail on the right instead of being buried below the fold.
    <main className="aura mx-auto w-full max-w-md px-5 pt-6 pb-16 sm:max-w-xl sm:px-8 lg:max-w-6xl lg:pt-12">
      <FadeUp
        as="header"
        className="mb-7 flex items-center justify-between gap-3 lg:mb-10"
        y={0}
        delay={DELAY.immediate}
      >
        <Logo />
        <div className="flex items-center gap-3">
          <UiLanguagePicker />
          <LivePulse />
        </div>
      </FadeUp>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* ---------------- Left column: the check flow ---------------- */}
        <div>
          <Stagger delay={DELAY.first}>
            <StaggerItem>
              {/* A plain question, not a slogan. Someone holding a forwarded
                  message needs to recognise instantly that this app answers
                  the question they already have. */}
              <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight sm:text-4xl lg:text-[42px]">
                {t.heroTitle}
              </h1>
              <p className="mt-3 mb-6 text-base leading-relaxed text-muted lg:mb-8">
                {t.heroSubtitle}
              </p>
            </StaggerItem>

            {/* THE primary action. Pasting a forwarded message is what this
                audience overwhelmingly arrives wanting to do, so it is the
                biggest, brightest thing on the page rather than one of three
                equally-weighted options. The accent glow lands the eye here. */}
            <StaggerItem>
              <Glow className="mb-4 rounded-3xl" delay={DELAY.second}>
                <Card raised className="border-accent/50 p-5 sm:p-6">
                  <form onSubmit={handleSubmit}>
                    <label
                      htmlFor="claim-input"
                      className="mb-3 block text-lg font-semibold sm:text-xl"
                    >
                      {t.composerTitle}
                    </label>
                    <textarea
                      id="claim-input"
                      ref={textareaRef}
                      value={speech.interim ? `${text} ${speech.interim}`.trim() : text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={PLACEHOLDER[language]}
                      rows={6}
                      maxLength={MAX_CLAIM_LENGTH}
                      // text-base rather than text-sm: 16px is readable without
                      // reading glasses, and also stops iOS Safari zooming the
                      // whole page the moment the field is focused.
                      className="field min-h-36 resize-y text-base lg:min-h-44"
                    />

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-faint">
                        {speech.listening
                          ? t.askHelpListening
                          : `${text.length} / ${MAX_CLAIM_LENGTH}`}
                      </span>
                      {text && (
                        <button
                          type="button"
                          onClick={() => setText("")}
                          className="min-h-9 px-2 text-xs text-faint transition-colors hover:text-danger"
                        >
                          {t.clear}
                        </button>
                      )}
                    </div>


                    {(error || speech.error) && (
                      <p className="mb-3 text-sm text-danger" role="alert">
                        {error || speech.error}
                      </p>
                    )}

                    {/* Deliberately oversized. This is the moment that matters,
                        and it should be impossible to miss or to mis-tap. */}
                    <PillButton
                      type="submit"
                      disabled={!text.trim() || loading}
                      className="min-h-14 w-full text-base"
                    >
                      {loading ? t.checking : SUBMIT_LABEL[language]}
                    </PillButton>
                  </form>
                </Card>
              </Glow>
            </StaggerItem>

            {/* Secondary ways in — equal to each other, clearly below the
                composer. Each pairs an icon with a plain-language label, so
                neither is guessed at. */}
            <StaggerItem>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <Pressable disabled={scanLoading}>
                  <label
                    className={`flex h-full cursor-pointer items-center gap-3 rounded-3xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                      scanLoading ? "opacity-70" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleScanFile}
                      disabled={scanLoading}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-xl text-accent"
                    >
                      ▣
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-medium">
                        {scanLoading ? t.scanReading : t.scanLabel}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">
                        {t.scanHelp}
                      </span>
                    </span>
                  </label>
                </Pressable>

                <Pressable disabled={!speech.supported}>
                  <button
                    type="button"
                    onClick={speech.supported ? speech.toggle : undefined}
                    disabled={!speech.supported}
                    aria-pressed={speech.listening}
                    className={`flex h-full w-full items-center gap-3 rounded-3xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                      speech.listening
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:border-accent"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-11 shrink-0 place-items-center rounded-full text-xl ${
                        speech.listening
                          ? "animate-pulse bg-danger/20 text-danger"
                          : "bg-accent-soft text-accent"
                      }`}
                    >
                      ◉
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-medium">{t.askLabel}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">
                        {!speech.supported
                          ? t.askHelpUnsupported
                          : speech.listening
                          ? t.askHelpListening
                          : t.askHelpIdle}
                      </span>
                    </span>
                  </button>
                </Pressable>
              </div>
              {scanError && (
                <p className="mb-3 text-sm text-danger" role="alert">
                  {scanError}
                </p>
              )}

              <p className="text-center text-sm leading-relaxed text-faint">
                {t.disclaimerShort}
              </p>
            </StaggerItem>
          </Stagger>
        </div>

        {/* ---------------- Right column: ambient context ---------------- */}
        <FadeUp as="aside" className="mt-10 lg:sticky lg:top-12 lg:mt-0" delay={DELAY.fourth}>
          <SectionLabel className="mb-2">{t.riskPortfolio}</SectionLabel>
          <div className="mb-8 grid grid-cols-3 gap-3">
            {RISK_ORDER.map((key) => (
              <Card key={key} className="p-4 text-center">
                <p className={`font-display text-3xl font-semibold ${RISK_CONFIG[key].text}`}>
                  {portfolio[key]}
                </p>
                <p className="label-tracked mt-1 text-[10px] text-muted">
                  {labels.risk(key)}
                </p>
              </Card>
            ))}
          </div>

          <TrendingSection />

          {history.length > 0 ? (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <SectionLabel>{t.recentChecks}</SectionLabel>
                {historyQuery.trim() && (
                  <span className="text-xs text-faint">
                    {filteredHistory.length} / {history.length}
                  </span>
                )}
              </div>

              {/* Only worth a search box once there's enough history that
                  scanning the list stops being faster than typing. */}
              {history.length > 3 && (
                <div className="relative mb-2">
                  <label htmlFor="history-search" className="sr-only">
                    {t.searchChecks}
                  </label>
                  <input
                    id="history-search"
                    type="search"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder={t.searchChecks}
                    className="field min-h-11 rounded-full pr-16 text-sm"
                  />
                  {historyQuery && (
                    <button
                      type="button"
                      onClick={() => setHistoryQuery("")}
                      className="absolute inset-y-0 right-0 px-4 text-xs text-faint transition-colors hover:text-accent"
                    >
                      {t.clear}
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {filteredHistory.slice(0, 10).map((item) => (
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
                      {labels.risk(item.riskLevel)}
                    </span>
                    <span className="text-muted" aria-hidden="true">
                      ›
                    </span>
                  </InteractiveCard>
                ))}
              </div>

              {filteredHistory.length === 0 && (
                <Card className="text-center">
                  <p className="text-sm leading-relaxed text-muted">
                    {t.noChecksMatch} &ldquo;{historyQuery.trim()}&rdquo;.
                  </p>
                </Card>
              )}
            </>
          ) : (
            <Card className="text-center">
              <p className="text-sm leading-relaxed text-muted">{t.emptyHistory}</p>
            </Card>
          )}
        </FadeUp>
      </div>

      {/* Site footer. The admin entrance lives here rather than in the header:
          it's for one or two people, not the public, so it shouldn't compete
          with the check flow — but it does need to be findable without
          knowing to type /admin by hand. */}
      <FadeUp as="footer" className="mt-12 border-t border-border pt-6" delay={DELAY.last}>
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-faint">{t.footerTagline}</p>
          <nav className="flex items-center gap-4">
            <Link
              href="/faq"
              className="min-h-11 py-2 text-sm text-muted transition-colors hover:text-accent"
            >
              {t.healthFaqs}
            </Link>
            <span className="text-faint" aria-hidden="true">
              ·
            </span>
            <Link
              href="/admin/login"
              className="min-h-11 py-2 text-sm text-muted transition-colors hover:text-accent"
            >
              {t.admin}
            </Link>
          </nav>
        </div>
      </FadeUp>
    </main>
  );
}
