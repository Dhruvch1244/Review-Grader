import { Router } from "express";
import { listReviewReviewers, setReviewReviewerMembership } from "../queries";

// Which reviewers have opted in to score a given class's given review - a
// reviewer can belong to multiple (class, review) pairs at once.
export const reviewReviewersRouter = Router();

reviewReviewersRouter.get("/", (req, res) => {
  const classId = req.query.classId as string | undefined;
  if (!classId) return res.status(400).json({ error: "classId is required" });
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
