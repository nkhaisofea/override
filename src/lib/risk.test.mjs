// Run with: npm test
//
// The risk mapping is the one piece of pure logic in Vitaura where being
// wrong is a safety problem rather than a cosmetic one: it decides whether a
// user sees CAUTION or HIGH RISK on a health claim. It's also the piece most
// likely to be "tidied" later by someone who doesn't know why the nullish
// check is separate from the isFinite check. Hence tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRiskLevel, verdictToRiskLevel, riskRationale } from "./risk.js";

test("a supported claim is safe regardless of how consequential the topic is", () => {
  assert.equal(deriveRiskLevel("true", 0), "safe");
  assert.equal(deriveRiskLevel("true", 95), "safe");
});

test("being wrong is separated from being dangerous", () => {
  // The whole point of the two-axis model: both are false, only one can hurt.
  assert.equal(deriveRiskLevel("false", 10), "caution"); // "honey soothes a cough"
  assert.equal(deriveRiskLevel("false", 95), "high_risk"); // "skip your insulin"
  assert.equal(deriveRiskLevel("misleading", 5), "caution");
  assert.equal(deriveRiskLevel("misleading", 80), "high_risk");
});

test("unverified escalates only when acting on it would be dangerous", () => {
  assert.equal(deriveRiskLevel("unverified", 20), "caution");
  assert.equal(deriveRiskLevel("unverified", 85), "high_risk");
});

test("threshold boundaries are inclusive at the dangerous end", () => {
  assert.equal(deriveRiskLevel("false", 29), "caution");
  assert.equal(deriveRiskLevel("false", 30), "high_risk");
  assert.equal(deriveRiskLevel("unverified", 59), "caution");
  assert.equal(deriveRiskLevel("unverified", 60), "high_risk");
});

test("a MISSING action risk falls back to the conservative verdict-only mapping", () => {
  // Regression: Number(null) and Number("") are 0, not NaN. Folding this into
  // the isFinite guard scored an unknown risk as maximally harmless — the most
  // dangerous possible default.
  for (const missing of [null, undefined, ""]) {
    assert.equal(deriveRiskLevel("false", missing), "high_risk");
    assert.equal(deriveRiskLevel("misleading", missing), "high_risk");
    assert.equal(deriveRiskLevel("unverified", missing), "caution");
    assert.equal(deriveRiskLevel("true", missing), "safe");
  }
  assert.equal(deriveRiskLevel("false", NaN), "high_risk");
  assert.equal(deriveRiskLevel("false", "not-a-number"), "high_risk");
});

test("a genuine zero still means harmless, and is not treated as missing", () => {
  assert.equal(deriveRiskLevel("false", 0), "caution");
  assert.equal(deriveRiskLevel("false", "0"), "caution");
});

test("verdict-only fallback matches the original spec mapping", () => {
  assert.equal(verdictToRiskLevel("true"), "safe");
  assert.equal(verdictToRiskLevel("unverified"), "caution");
  assert.equal(verdictToRiskLevel("false"), "high_risk");
  assert.equal(verdictToRiskLevel("misleading"), "high_risk");
});

test("every path produces a non-empty rationale for the UI", () => {
  for (const verdict of ["true", "false", "misleading", "unverified"]) {
    for (const score of [null, 0, 45, 100]) {
      const level = deriveRiskLevel(verdict, score);
      const text = riskRationale(verdict, score, level);
      assert.ok(text && text.length > 10, `empty rationale for ${verdict}/${score}`);
    }
  }
});
