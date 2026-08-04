import { Router } from "express";
import { listClasses, getClassData, listReviews, getScoresForClass } from "../queries";
import { buildExportRows } from "../export-rows";
import { studentLeaderboard } from "../stats-utils";
import { computeNormalization, type RawStudentScore } from "../normalization";

export const normalizeRouter = Router();

normalizeRouter.get("/", (_req, res) => {
  const classes = listClasses();
  const reviews = listReviews();
  const rows: RawStudentScore[] = [];

  for (const cls of classes) {
    const data = getClassData(cls.id);
    if (!data) continue;
    const { teamScores, individualScores } = getScoresForClass(cls.id);
    const { teamScoreRows, individualScoreRows } = buildExportRows(data, reviews, teamScores, individualScores);
    const leaderboard = studentLeaderboard(teamScoreRows, individualScoreRows);
    for (const s of leaderboard) {
      if (s.overall === null) continue;
      rows.push({ classId: cls.id, className: cls.name, team: s.team, student: s.student, raw: s.overall });
    }
  }

  res.json(computeNormalization(rows));
});
