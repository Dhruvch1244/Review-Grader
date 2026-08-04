import type {
  TeamScoreExportRow,
  IndividualScoreExportRow,
  SummaryExportRow,
} from "./models/types";

// Pure aggregation logic shared by the server-side export (single class,
// read straight from SQLite) and the browser-side merge tool (many classes,
// read from parsed xlsx files). No DB access here on purpose.

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function buildSummaryRows(
  teamScores: TeamScoreExportRow[],
  individualScores: IndividualScoreExportRow[]
): SummaryExportRow[] {
  const teamAvgByKey = new Map<string, number | null>();
  const teamKeysSeen = new Set<string>();
  for (const row of teamScores) {
    const key = `${row.Class}::${row.Team}::${row.ReviewNumber}`;
    teamKeysSeen.add(key);
  }
  for (const key of teamKeysSeen) {
    const [cls, team, reviewNumber] = key.split("::");
    const scores = teamScores
      .filter(
        (r) => r.Class === cls && r.Team === team && String(r.ReviewNumber) === reviewNumber
      )
      .map((r) => r.Score)
      .filter((s): s is number => s !== null && s !== undefined);
    teamAvgByKey.set(key, avg(scores));
  }

  return individualScores.map((ind) => {
    const key = `${ind.Class}::${ind.Team}::${ind.ReviewNumber}`;
    const teamAvg = teamAvgByKey.get(key) ?? null;
    const delta = ind.Delta ?? 0;
    const grace = ind.Grace ?? 0;
    const finalScore = teamAvg !== null ? Math.round((teamAvg + delta + grace) * 100) / 100 : null;
    return {
      Class: ind.Class,
      Team: ind.Team,
      Student: ind.Student,
      ReviewNumber: ind.ReviewNumber,
      ReviewLabel: ind.ReviewLabel,
      TeamAvg: teamAvg,
      Delta: ind.Delta,
      Grace: ind.Grace,
      FinalScore: finalScore,
    };
  });
}

export function overallByStudent(
  summary: SummaryExportRow[]
): { Class: string; Team: string; Student: string; OverallFinalScore: number | null; ReviewsScored: number }[] {
  const byStudent = new Map<string, SummaryExportRow[]>();
  for (const row of summary) {
    const key = `${row.Class}::${row.Team}::${row.Student}`;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(row);
  }
  return Array.from(byStudent.entries()).map(([key, rows]) => {
    const [Class, Team, Student] = key.split("::");
    const finals = rows.map((r) => r.FinalScore).filter((s): s is number => s !== null && s !== undefined);
    return {
      Class,
      Team,
      Student,
      OverallFinalScore: avg(finals),
      ReviewsScored: finals.length,
    };
  });
}
