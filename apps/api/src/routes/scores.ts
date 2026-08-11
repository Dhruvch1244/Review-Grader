import { Router } from "express";
import { getScoresForClass, getTeamScoreEntries, upsertTeamScore, upsertIndividualScore, upsertGrace } from "../queries";

export const scoresRouter = Router();

scoresRouter.get("/", (req, res) => {
  const classId = req.query.classId as string | undefined;
  if (!classId) return res.status(400).json({ error: "classId is required" });
  res.json(getScoresForClass(classId));
});

/** Raw per-reviewer team-score entries for one team+review, so the Score/
 * Review UI can highlight "what did I click" separately from the averaged
 * display everyone sees. */
scoresRouter.get("/team-entries", (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  if (!teamId || !reviewId) {
    return res.status(400).json({ error: "teamId and reviewId are required" });
  }
  res.json(getTeamScoreEntries(teamId, reviewId));
});

scoresRouter.put("/team", (req, res) => {
  const body = req.body ?? {};
  if (!body.teamId || !body.reviewId || !body.criterionId || !body.reviewerId) {
    return res.status(400).json({ error: "teamId, reviewId, criterionId, reviewerId are required" });
  }
  const row = upsertTeamScore({
    teamId: body.teamId,
    reviewId: body.reviewId,
    criterionId: body.criterionId,
    reviewerId: body.reviewerId,
    score: body.score ?? null,
    notes: body.notes ?? null,
  });
  res.json(row);
});

scoresRouter.put("/individual", (req, res) => {
  const body = req.body ?? {};
  if (!body.studentId || !body.reviewId) {
    return res.status(400).json({ error: "studentId, reviewId are required" });
  }
  const row = upsertIndividualScore({
    studentId: body.studentId,
    reviewId: body.reviewId,
    delta: body.delta ?? null,
    notes: body.notes ?? null,
  });
  res.json(row);
});

scoresRouter.put("/grace", (req, res) => {
  const body = req.body ?? {};
  if (!body.studentId || !body.reviewId) {
    return res.status(400).json({ error: "studentId, reviewId are required" });
  }
  const row = upsertGrace(body.studentId, body.reviewId, body.grace ?? null);
  res.json(row);
});
