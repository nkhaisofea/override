// How a verdict becomes a risk level.
//
// The naive mapping is verdict-only: true -> safe, unverified -> caution,
// false/misleading -> high risk. It's easy to explain, but it's wrong in a way
// that matters here, because it conflates "this claim is incorrect" with
// "this claim is dangerous." Those are different questions:
//
//   "Honey soothes a cough"          -> false, but acting on it harms nobody.
//   "Type 1 diabetics can skip insulin" -> false, and acting on it kills.
//
// Flagging both as HIGH RISK trains people to ignore the label, which is the
// exact failure mode a misinformation tool cannot afford. So the categorical
// verdict decides *whether* there's a problem, and the model's separate
// 0-100 actionRisk score (see lib/gemini.js) decides *how loud* to be
// about it.
//
// actionRisk is asked for independently of the verdict, precisely so it can
// disagree with it — see the system prompt for why that independence is the
// point rather than a bug.

export const RISK_LEVELS = ["safe", "caution", "high_risk"];

// Above this, acting on a wrong claim is judged capable of real harm
// (delayed treatment, stopped medication, something toxic ingested).
const HIGH_ACTION_RISK = 60;
// Below this, being wrong is judged materially harmless.
const LOW_ACTION_RISK = 30;

/**
 * Verdict-only fallback — the mapping used when we have no actionRisk score
 * (older records written before the two-axis model, or a degraded response).
 * Deliberately conservative: with no signal about danger, assume the worst.
 */
export function verdictToRiskLevel(verdict) {
  if (verdict === "true") return "safe";
  if (verdict === "unverified") return "caution";
  return "high_risk"; // false or misleading
}

/**
 * The real mapping: categorical verdict, moderated by how dangerous it would
 * be to act on the claim.
 *
 * @param {string} verdict - true | false | misleading | unverified
 * @param {number|null|undefined} actionRisk - 0-100, or nullish if unknown
 * @returns {"safe"|"caution"|"high_risk"}
 */
export function deriveRiskLevel(verdict, actionRisk) {
  // The nullish check has to come first and cannot be folded into the
  // isFinite guard: Number(null) and Number("") are both 0, not NaN, so a
  // claim with no recorded action risk would otherwise score as maximally
  // harmless — the most dangerous possible default, and the exact opposite of
  // the conservative fallback intended here.
  if (actionRisk === null || actionRisk === undefined || actionRisk === "") {
    return verdictToRiskLevel(verdict);
  }
  const score = Number(actionRisk);
  if (!Number.isFinite(score)) return verdictToRiskLevel(verdict);

  // A claim the sources confirm is safe to believe regardless of how
  // consequential the subject matter is — actionRisk asks what happens if the
  // claim is *wrong*, and here it isn't.
  if (verdict === "true") return "safe";

  if (verdict === "unverified") {
    // No evidence either way. Dangerous-if-wrong means don't act on it;
    // otherwise it's merely unconfirmed.
    return score >= HIGH_ACTION_RISK ? "high_risk" : "caution";
  }

  // false | misleading — incorrect, so the only question is the blast radius.
  if (score < LOW_ACTION_RISK) return "caution";
  return "high_risk";
}

/**
 * Which rationale applies, as a stable key rather than an English sentence.
 *
 * Returning a key keeps this module language-agnostic: lib/i18n.js maps the
 * key to Malay, English or Chinese, so switching language on the result page
 * costs no model call for this part.
 */
export function riskRationaleKey(verdict, actionRisk, riskLevel) {
  if (verdict === "true") return "supported";

  const score = Number(actionRisk);
  const known =
    actionRisk !== null && actionRisk !== undefined && actionRisk !== "" &&
    Number.isFinite(score);

  if (verdict === "unverified") {
    return riskLevel === "high_risk" ? "unverifiedRisky" : "unverified";
  }

  // false | misleading
  if (!known) return "wrong";
  return riskLevel === "high_risk" ? "wrongAndDangerous" : "wrongButHarmless";
}

/**
 * English convenience wrapper. The UI goes through lib/i18n.js instead; this
 * exists so non-localised callers (and the tests) keep a plain string.
 */
export function riskRationale(verdict, actionRisk, riskLevel) {
  const EN = {
    supported: "Supported by our trusted sources.",
    unverifiedRisky: "Unconfirmed, and acting on it could be harmful — treat with care.",
    unverified: "We couldn't confirm this either way against a trusted source.",
    wrongAndDangerous: "Incorrect, and acting on it could cause real harm.",
    wrongButHarmless: "Incorrect, but unlikely to cause harm on its own.",
    wrong: "This claim doesn't hold up against our trusted sources.",
  };
  return EN[riskRationaleKey(verdict, actionRisk, riskLevel)];
}
