import { Router } from "express";
import { getDirectScoreEntries, upsertDirectScore } from "../queries";

export const directScoresRouter = Router();

/** Raw per-reviewer direct-mode entries for one team+review - own-entry
 * editing and section-score computation both start from this. */
directScoresRouter.get("/", (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!teamId || !reviewId) return res.status(400).json({ error: "teamId and reviewId are required" });
  res.json(getDirectScoreEntries(teamId, reviewId));
});

/** Body: { sectionId, teamId, studentId, reviewerId, score }. studentId is
 * required for individual-scope sections, omit/null for team-scope ones.
 * score: null clears this reviewer's entry. */
directScoresRouter.put("/", (req, res) => {
  const body = req.body ?? {};
  if (!body.sectionId || !body.teamId || !body.reviewerId) {
    return res.status(400).json({ error: "sectionId, teamId, reviewerId are required" });
  }
  const score = body.score === null || body.score === undefined ? null : Number(body.score);
  if (score !== null && Number.isNaN(score)) {
    return res.status(400).json({ error: "score must be a number or null" });
  }
  const result = upsertDirectScore(body.sectionId, body.teamId, body.studentId ?? null, body.reviewerId, score);
  res.json(result);
});
