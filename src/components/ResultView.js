"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card, PillButton, SectionLabel } from "@/components/Card";
import { VerdictBadge, RiskBadge, RISK_CONFIG } from "@/components/StatusBadge";
import { ScoreMeter } from "@/components/ScoreMeter";
import ShareButton from "@/components/ShareButton";
import UiLanguagePicker from "@/components/UiLanguagePicker";
import { useUiLanguage } from "@/lib/uiLanguage";
import { t, rationaleText } from "@/lib/i18n";
import { riskRationaleKey } from "@/lib/risk";
import { Stagger, StaggerItem, CrossFade, Glow, FadeUp, DELAY } from "@/components/motion";

// The bloom is tinted to the risk level, so the colour of the light matches
// the badge the reader is about to see.
const GLOW_TINT = {
  safe: "29 184 118",
  caution: "245 180 0",
  high_risk: "239 68 68",
};

/**
 * The result body.
 *
 * ONE language control governs this page: the picker in the header. Choosing a
 * language changes the labels, the buttons, the badges AND the verdict text
 * itself — there is no separate "answer language" to reason about. Two
 * language controls on one screen was a question the reader had no basis to
 * answer, and it allowed the contradictory state of Malay chrome wrapped
 * around an English verdict.
 *
 * The one deliberate exception is the "what you asked" card, which always
 * shows the original message untouched. That is not a translation decision —
 * it is the record of what the person actually sent.
 *
 * The server component still owns data loading and generateMetadata; this
 * receives an already-serialised plain object, so no Mongo types cross the
 * boundary.
 */
export default function ResultView({ claim }) {
  const { language, t: copy } = useUiLanguage();

  const originalLanguage = claim.language || "en";

  // Translations fetched this session, keyed by language. Held in state rather
  // than a ref so the render reads from it directly: the displayed translation
  // is then DERIVED from (language, cache) instead of being copied into a
  // second piece of state by an effect. That is what keeps the effect free of
  // synchronous setState calls on the "already original" and "already cached"
  // paths, which would otherwise cascade a render on every language change.
  const [cache, setCache] = useState({});
  const [translating, setTranslating] = useState(false);
  // Errors are stored WITH the language they belong to, so switching away from
  // a failed language hides the message without needing to clear it.
  const [failure, setFailure] = useState(null);

  const needsTranslation = language !== originalLanguage;
  const translation = needsTranslation ? cache[language] || null : null;
  const translateError = failure?.language === language ? failure.message : "";

  useEffect(() => {
    if (!needsTranslation || cache[language]) return;

    let cancelled = false;
    // Not a cascading render: this guards an async fetch that has already been
    // determined to be necessary, and every other state write below happens in
    // a callback after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslating(true);

    fetch(`/api/claims/${claim.id}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          // Fall back to the original text rather than showing a half
          // translated page. The chrome is still in the chosen language.
          setFailure({ language, message: data.error || t(language).translationFailed });
          return;
        }
        setCache((prev) => ({
          ...prev,
          [language]: {
            claim: data.claim,
            explanation: data.explanation,
            sourceTitles: Array.isArray(data.sourceTitles) ? data.sourceTitles : null,
          },
        }));
        setFailure(null);
      })
      .catch(() => {
        if (!cancelled) {
          setFailure({ language, message: t(language).translationFailed });
        }
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [language, needsTranslation, cache, claim.id]);

  const riskCfg = RISK_CONFIG[claim.riskLevel] || RISK_CONFIG.caution;

  // Verdict, risk level and the two scores are language-independent facts
  // decided at check time. Only the two AI-written strings swap.
  const claimText = translation?.claim || claim.claim || claim.text;
  const explanation = translation?.explanation || claim.explanation;

  const rationale = rationaleText(
    riskRationaleKey(claim.verdict, claim.actionRisk, claim.riskLevel),
    language
  );

  // Only a definitive verdict shows its evidence.
  //
  // "true" and "false" are settled calls, and the source is what makes them
  // checkable. "unverified" means no source covered the claim, so citing one
  // would misrepresent what happened. "misleading" is excluded by product
  // decision: a partially-true claim tends to retrieve loosely-related
  // material, and putting an authoritative-looking citation under a hedged
  // verdict reads as firmer backing than the model actually had.
  //
  // The sources are still stored on the claim either way, so an admin
  // reviewing a verdict in the claims log can see exactly what evidence the
  // model was shown before deciding whether to override it.
  const showsSources = claim.verdict === "true" || claim.verdict === "false";
  const baseSources = !showsSources
    ? []
    : claim.supportingSources?.length > 0
    ? claim.supportingSources
    : claim.sourceCitation
    ? [{ ...claim.sourceCitation, citedByModel: true, score: null }]
    : [];

  // Citation titles follow the page language too. They arrive in the same
  // translation payload as the verdict, so this costs nothing extra — and it
  // removes the last English seam on an otherwise fully translated page.
  //
  // Positional mapping is safe here because the API only returns the array
  // when its length matches what it was given; a mismatch comes back as the
  // originals, so a title can never end up attached to the wrong source.
  const translatedTitles = translation?.sourceTitles;
  const sources =
    translatedTitles && translatedTitles.length === baseSources.length
      ? baseSources.map((s, i) => ({ ...s, title: translatedTitles[i] || s.title }))
      : baseSources;

  const dimWhileTranslating = translating ? "opacity-60" : "";

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-16 sm:max-w-xl sm:px-8 lg:max-w-4xl lg:pt-12">
      <FadeUp as="header" className="mb-6 flex items-center justify-between gap-3" y={0}>
        <Logo href="/" />
        <div className="flex items-center gap-3">
          {/* The only language control on the page. */}
          <UiLanguagePicker />
          <ShareButton title={`${claimText}`} />
        </div>
      </FadeUp>

      {(translating || translateError) && (
        <div className="mb-4">
          {translating && (
            <p className="text-sm text-muted" role="status">
              {copy.translating}
            </p>
          )}
          {translateError && (
            <p className="text-sm text-danger" role="alert">
              {translateError}
            </p>
          )}
        </div>
      )}

      <Stagger delay={DELAY.first}>
        {/* What the person actually sent, verbatim.
            Never translated and never rewritten, whatever language the page is
            in — the point is that they can confirm the app read the right
            message. A tidied-up paraphrase here makes people doubt their own
            memory of what they pasted. */}
        {claim.text && (
          <StaggerItem>
            <SectionLabel className="mb-2">{copy.youAsked}</SectionLabel>
            <Card className="mb-4 border-l-4 border-border-strong">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{claim.text}</p>
              <p className="mt-2 text-xs text-faint">{copy.yourExactWords}</p>
            </Card>
          </StaggerItem>
        )}

        <StaggerItem>
          <SectionLabel className="mb-2">{copy.claimChecked}</SectionLabel>
          <Glow className="rounded-3xl" tint={GLOW_TINT[claim.riskLevel] || GLOW_TINT.caution}>
            <Card
              raised
              className={`mb-4 border-l-4 ${riskCfg.border} lg:p-7 ${dimWhileTranslating}`}
            >
              {/* Keyed on language so a swap cross-fades instead of snapping —
                  the same sentence differs noticeably in length between BM,
                  EN, 中文 and தமிழ். */}
              <CrossFade motionKey={`claim-${language}`}>
                <p className="mb-4 text-base leading-snug sm:text-lg lg:text-xl">
                  {claimText}
                </p>
              </CrossFade>
              <div className="flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={claim.verdict} size="lg" />
                <RiskBadge riskLevel={claim.riskLevel} />
              </div>
              <CrossFade motionKey={`rationale-${language}`}>
                <p className="mt-3 text-sm leading-relaxed text-muted">{rationale}</p>
              </CrossFade>
              {claim.overriddenBy && (
                <p className="mt-3 rounded-xl bg-accent-softer px-3 py-2 text-xs leading-relaxed text-accent">
                  {copy.overridden}
                  {claim.overrideNote ? ` ${claim.overrideNote}` : ""}
                </p>
              )}
            </Card>
          </Glow>
        </StaggerItem>

        <StaggerItem>
          <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
            <div>
              <SectionLabel className="mb-2">{copy.why}</SectionLabel>
              <Card className={`mb-4 lg:mb-0 ${dimWhileTranslating}`}>
                <CrossFade motionKey={`why-${language}`}>
                  <p className="text-base leading-relaxed">{explanation}</p>
                </CrossFade>
              </Card>
            </div>

            {(claim.evidenceConfidence != null || claim.actionRisk != null) && (
              <div>
                <SectionLabel className="mb-2">{copy.twoAxis}</SectionLabel>
                <Card className="mb-4 flex flex-col gap-4 lg:mb-0">
                  <ScoreMeter
                    label={copy.evidenceConfidence}
                    value={claim.evidenceConfidence}
                    tone="accent"
                    description={copy.evidenceConfidenceHelp}
                  />
                  <ScoreMeter
                    label={copy.actionRisk}
                    value={claim.actionRisk}
                    tone="danger"
                    description={copy.actionRiskHelp}
                  />
                </Card>
              </div>
            )}
          </div>

          {/* Unverified still explains WHY there's nothing to cite — silence
              there would read as an omission rather than an honest
              "we don't know". */}
          {claim.verdict === "unverified" && (
            <div className="mt-4">
              <SectionLabel className="mb-2">{copy.source}</SectionLabel>
              <Card>
                <p className="text-sm leading-relaxed text-muted">
                  {copy.noSourceUnverified}
                </p>
              </Card>
            </div>
          )}

          {/* Every source that backed the verdict, not just the headline one. A
              "false" is an accusation, so the evidence behind it is shown in
              full and the model's own pick is flagged. */}
          {showsSources && sources.length > 0 && (
            <div className="mt-4">
              <SectionLabel className="mb-2">
                {sources.length > 1 ? copy.supportingEvidence : copy.source}
              </SectionLabel>

              <div className="flex flex-col gap-2">
                {sources.map((s, i) => {
                  const inner = (
                    <Card
                      className={`flex items-center justify-between gap-3 transition-colors ${
                        s.url ? "hover:border-accent" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{s.title}</p>
                        {s.citedByModel && sources.length > 1 && (
                          <span className="label-tracked mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[9px] text-accent">
                            {copy.modelPick}
                          </span>
                        )}
                      </div>
                      {s.url && (
                        <span className="shrink-0 text-accent" aria-hidden="true">
                          ↗
                        </span>
                      )}
                    </Card>
                  );
                  return s.url ? (
                    <a
                      key={`${s.title}-${i}`}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={`${s.title}-${i}`}>{inner}</div>
                  );
                })}
              </div>
            </div>
          )}
        </StaggerItem>

        <StaggerItem>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="flex-1">
              <PillButton className="min-h-14 w-full text-base">
                {copy.checkAnother}
              </PillButton>
            </Link>
            <Link href="/faq" className="flex-1">
              <PillButton variant="outline" className="min-h-14 w-full text-base">
                {copy.browseFaqs}
              </PillButton>
            </Link>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-faint">
            {copy.disclaimer}
          </p>
        </StaggerItem>
      </Stagger>
    </main>
  );
}
