import { Router } from "express";
import { getScoresForClass } from "../queries";

export const scoresRouter = Router();

/** Every team's computed section scores + review totals for a class - the
 * shape Score/Review/Stats/Export all consume. Per-reviewer raw entries
 * live at /api/subtopic-scores. */
scoresRouter.get("/", (req, res) => {
  const classId = req.query.classId as string | undefined;
  if (!classId) return res.status(400).json({ error: "classId is required" });
  res.json(getScoresForClass(classId));
});
