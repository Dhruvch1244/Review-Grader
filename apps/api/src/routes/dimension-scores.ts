import { Router } from "express";
import { getDimensionScores, upsertDimensionScore } from "../queries";

export const dimensionScoresRouter = Router();

dimensionScoresRouter.get("/", (req, res) => {
  const studentId = req.query.studentId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!studentId || !reviewId) {
    return res.status(400).json({ error: "studentId and reviewId are required" });
  }
  res.json(getDimensionScores(studentId, reviewId));
});

dimensionScoresRouter.put("/", (req, res) => {
  const { studentId, reviewId, dimensionId, reviewerId, score } = req.body ?? {};
  if (!studentId || !reviewId || !dimensionId || !reviewerId) {
    return res.status(400).json({ error: "studentId, reviewId, dimensionId, and reviewerId are required" });
  }
  res.json(upsertDimensionScore(studentId, reviewId, dimensionId, reviewerId, score ?? null));
});
