// Topic tags are the filter key shared by sources, claims, and FAQ posts, so
// they're normalised on the way in. Without this, "Dengue", "dengue " and
// "#dengue" become three separate filters and the public FAQ topic filter
// silently splits one topic across several buckets.

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;

/**
 * @param {string[]|string|unknown} input - an array of tags, or a
 *   comma-separated string (what the admin form submits).
 * @returns {string[]} lowercase, hyphenated, de-duplicated, capped tags.
 */
export function normalizeTags(input) {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(",")
    : [];

  const seen = new Set();
  for (const tag of raw) {
    const clean = String(tag)
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, MAX_TAG_LENGTH);
    if (clean) seen.add(clean);
  }
  return [...seen].slice(0, MAX_TAGS);
}
