import { Router } from "express";
import { upsertQuestionRating } from "../queries";
import type { QuestionRating } from "../types";

export const questionRatingsRouter = Router();

questionRatingsRouter.put("/", (req, res) => {
  const body = req.body ?? {};
  const { studentId, reviewId, criterionId, rating } = body as {
    studentId: string;
    reviewId: string;
    criterionId: string;
    rating: QuestionRating | null;
  };
  if (!studentId || !reviewId || !criterionId) {
    return res.status(400).json({ error: "studentId, reviewId, criterionId are required" });
  }
  const result = upsertQuestionRating(studentId, reviewId, criterionId, rating ?? null);
  res.json(result);
});
