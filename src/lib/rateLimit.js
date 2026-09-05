// Simple in-memory sliding-window rate limiter. Good enough for a hackathon
// demo on a single running instance — not distributed-safe, but it's cheap
// insurance against someone spamming the check endpoint (and burning the
// Gemini quota) during the live demo.

const buckets = new Map();

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key) || [];
  const recent = bucket.filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true };
}

export function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
