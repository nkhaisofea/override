// Run with: npm test
//
// Tag normalisation is what keeps the public FAQ topic filter from splitting
// one topic across several buckets. Auto-generated posts get their tag from
// the model, manual posts get it from a free-text admin field, and seeded
// sources get it from a hand-written array — three uncoordinated inputs that
// have to land on the same string.

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTags } from "./tags.js";

test("case, whitespace and hash variants collapse to one tag", () => {
  assert.deepEqual(normalizeTags([" Dengue ", "#dengue", "DENGUE"]), ["dengue"]);
});

test("accepts the comma-separated string the admin form submits", () => {
  assert.deepEqual(normalizeTags("vaccines, covid 19 ,Cancer"), [
    "vaccines",
    "covid-19",
    "cancer",
  ]);
});

test("spaces become hyphens, and runs of hyphens collapse", () => {
  assert.deepEqual(normalizeTags(["heart   disease"]), ["heart-disease"]);
  assert.deepEqual(normalizeTags(["a -- b"]), ["a-b"]);
});

test("leading and trailing hyphens are trimmed", () => {
  assert.deepEqual(normalizeTags(["-dengue-"]), ["dengue"]);
  assert.deepEqual(normalizeTags(["--"]), []);
});

test("punctuation and non-ASCII are stripped rather than producing junk tags", () => {
  assert.deepEqual(normalizeTags(["!!!", "c@ncer", "健康"]), ["cncer"]);
});

test("order is preserved and duplicates removed", () => {
  assert.deepEqual(normalizeTags(["b", "a", "b"]), ["b", "a"]);
});

test("caps at 8 tags", () => {
  assert.equal(normalizeTags("a,b,c,d,e,f,g,h,i,j,k").length, 8);
});

test("each tag is capped at 30 characters", () => {
  const [tag] = normalizeTags(["x".repeat(50)]);
  assert.equal(tag.length, 30);
});

test("garbage input returns an empty array rather than throwing", () => {
  for (const input of [null, undefined, 0, false, {}, [], ""]) {
    assert.deepEqual(normalizeTags(input), [], `failed for ${JSON.stringify(input)}`);
  }
});
