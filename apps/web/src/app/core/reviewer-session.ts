// Which reviewer is "me" right now - one global identity for this browser
// (picked once on the Scoring page or wherever it's first asked), not
// per-class - the panel-assignment model needs a single identity to filter
// "what am I assigned to" across every class. Persisted in localStorage so
// it survives reloads/navigation, not just the current tab.
const KEY = "review-grader-reviewer-id";

export function getStoredReviewerId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setStoredReviewerId(reviewerId: string | null) {
  if (typeof localStorage === "undefined") return;
  if (reviewerId) localStorage.setItem(KEY, reviewerId);
  else localStorage.removeItem(KEY);
}
