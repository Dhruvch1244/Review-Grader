import { Router } from "express";
import { listClasses, getClassData, listReviews, getScoresForClass } from "../queries";
import { buildExportRows } from "../export-rows";
import { teamGrandTotals } from "../rollup";
import { computeNormalization, type RawTeamScore } from "../normalization";

export const normalizeRouter = Router();

normalizeRouter.get("/", (_req, res) => {
  const classes = listClasses();
  const reviews = listReviews();
  const rows: RawTeamScore[] = [];

  for (const cls of classes) {
    const data = getClassData(cls.id);
    if (!data) continue;
    const { sectionScores, reviewTotals } = getScoresForClass(cls.id);
    const { reviewTotalRows } = buildExportRows(data, reviews, sectionScores, reviewTotals);
    const grand = teamGrandTotals(reviewTotalRows);
    for (const t of grand) {
      if (t.Percentage === null) continue;
      rows.push({ classId: cls.id, className: cls.name, team: t.Team, raw: t.Percentage });
    }
  }

  res.json(computeNormalization(rows));
});
