"use client";

// No-login design: each browser gets a random sessionId (persisted in
// localStorage) so the "recent checks" list and risk portfolio stats can be
// scoped per-person without any account. This also lets the auto-FAQ
// clustering logic approximate "distinct users."

const SESSION_KEY = "vitaura_session_id";
const HISTORY_KEY = "vitaura_history";
const MAX_HISTORY = 50;

export function getSessionId() {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function getHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry) {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();
    history.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage can throw in private mode / disabled storage — non-fatal.
  }
}

export function getPortfolioCounts() {
  const history = getHistory();
  const counts = { safe: 0, caution: 0, high_risk: 0 };
  for (const item of history) {
    if (counts[item.riskLevel] !== undefined) counts[item.riskLevel]++;
  }
  return counts;
}
