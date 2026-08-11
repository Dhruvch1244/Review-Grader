import { Router } from "express";
import { getAskedQuestions, addAskedQuestion, updateAskedQuestion, deleteAskedQuestion } from "../queries";

export const askedQuestionsRouter = Router();

askedQuestionsRouter.get("/", (req, res) => {
  const studentId = req.query.studentId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!studentId || !reviewId) {
    return res.status(400).json({ error: "studentId and reviewId are required" });
  }
  res.json(getAskedQuestions(studentId, reviewId));
});

askedQuestionsRouter.post("/", (req, res) => {
  const { studentId, reviewId, text } = req.body ?? {};
  if (!studentId || !reviewId || !text) {
    return res.status(400).json({ error: "studentId, reviewId, and text are required" });
  }
  res.json(addAskedQuestion(studentId, reviewId, text));
});

askedQuestionsRouter.put("/:id", (req, res) => {
  const { text, rating } = req.body ?? {};
  res.json(updateAskedQuestion(req.params.id, { text, rating }));
});

askedQuestionsRouter.delete("/:id", (req, res) => {
  deleteAskedQuestion(req.params.id);
  res.json({ ok: true });
});
