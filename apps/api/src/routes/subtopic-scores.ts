import { Router } from "express";
import { getSubtopicScoreEntries, upsertSubtopicScore } from "../queries";

export const subtopicScoresRouter = Router();

/** Raw per-reviewer entries for one team+review - own-entry highlighting
 * and section-score computation both start from this. */
subtopicScoresRouter.get("/", (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!teamId || !reviewId) return res.status(400).json({ error: "teamId and reviewId are required" });
  res.json(getSubtopicScoreEntries(teamId, reviewId));
});

subtopicScoresRouter.put("/", (req, res) => {
  const body = req.body ?? {};
  if (!body.subtopicId || !body.teamId || !body.reviewerId) {
    return res.status(400).json({ error: "subtopicId, teamId, reviewerId are required" });
  }
  const result = upsertSubtopicScore(body.subtopicId, body.teamId, body.reviewerId, body.band ?? null);
  res.json(result);
});
