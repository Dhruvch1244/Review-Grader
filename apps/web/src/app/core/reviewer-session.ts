// Which reviewer is "me" on the Score/Review pages right now - picked per
// scoring session (not a fixed device identity), remembered per class for
// the rest of this browser tab via sessionStorage so navigating between
// Score and guided Review for the same class doesn't require re-picking.
const KEY_PREFIX = "review-grader-reviewer-for-class-";

export function getStoredReviewerId(classId: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(KEY_PREFIX + classId);
}

export function setStoredReviewerId(classId: string, reviewerId: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (reviewerId) sessionStorage.setItem(KEY_PREFIX + classId, reviewerId);
  else sessionStorage.removeItem(KEY_PREFIX + classId);
}
