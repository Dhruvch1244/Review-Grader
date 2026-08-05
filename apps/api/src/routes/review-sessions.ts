import { Router } from "express";
import { getReviewSession, updateReviewSession } from "../queries";

export const reviewSessionsRouter = Router();

reviewSessionsRouter.get("/", (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!teamId || !reviewId) {
    return res.status(400).json({ error: "teamId and reviewId are required" });
  }
  res.json(getReviewSession(teamId, reviewId));
});

reviewSessionsRouter.patch("/", (req, res) => {
  const body = req.body ?? {};
  const { teamId, reviewId, ...patch } = body;
  if (!teamId || !reviewId) {
    return res.status(400).json({ error: "teamId and reviewId are required" });
  }
  res.json(updateReviewSession(teamId, reviewId, patch));
});
