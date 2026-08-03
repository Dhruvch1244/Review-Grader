import { NextResponse } from "next/server";
import { listClasses, getClassData, listReviews, getScoresForClass } from "@/lib/queries";
import { buildExportRows } from "@/lib/export-rows";
import { studentLeaderboard } from "@/lib/stats-utils";
import { computeNormalization, type RawStudentScore } from "@/lib/normalization";

export async function GET() {
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

  return NextResponse.json(computeNormalization(rows));
}
