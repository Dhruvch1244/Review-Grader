import { Router } from "express";
import { listReviewReviewers, listReviewReviewersForReviewer, setReviewReviewerMembership } from "../queries";

// Which reviewers are assigned (by the admin) to score a given class's
// given review - a reviewer can belong to multiple (class, review) pairs
// at once. ?reviewerId= filters to one reviewer's own assignments across
// every class (the reviewer-facing filtered view); ?classId= filters to
// one class (used nowhere currently but kept for completeness); no query
// params returns everything (the admin assignment matrix).
export const reviewReviewersRouter = Router();

reviewReviewersRouter.get("/", (req, res) => {
  const reviewerId = req.query.reviewerId as string | undefined;
  const classId = req.query.classId as string | undefined;
  if (reviewerId) return res.json(listReviewReviewersForReviewer(reviewerId));
  res.json(listReviewReviewers(classId));
});

reviewReviewersRouter.put("/", (req, res) => {
  const body = req.body ?? {};
  if (!body.classId || !body.reviewId || !body.reviewerId || typeof body.member !== "boolean") {
    return res.status(400).json({ error: "classId, reviewId, reviewerId, member are required" });
  }
  setReviewReviewerMembership(body.classId, body.reviewId, body.reviewerId, body.member);
  res.json({ ok: true });
});
