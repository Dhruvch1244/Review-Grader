import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreExportRow,
  IndividualScoreExportRow,
} from "./types";
import { buildSummaryRows, overallByStudent } from "./rollup";

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function teamOverallAverages(
  classData: ClassData,
  teamScoreRows: TeamScoreExportRow[]
): { team: string; avg: number | null; scored: number }[] {
  return classData.teams.map((t) => {
    const scores = teamScoreRows
      .filter((r) => r.Team === t.name)
      .map((r) => r.Score)
      .filter((s): s is number => s !== null && s !== undefined);
    return { team: t.name, avg: avg(scores), scored: scores.length };
  });
}

export function teamTrendByReview(
  classData: ClassData,
  reviews: ReviewWithCriteria[],
  teamScoreRows: TeamScoreExportRow[]
): Record<string, number | string | null>[] {
  return reviews.map((r) => {
    const row: Record<string, number | string | null> = { review: `R${r.number}` };
    for (const t of classData.teams) {
      const scores = teamScoreRows
        .filter((tr) => tr.Team === t.name && tr.ReviewNumber === r.number)
        .map((tr) => tr.Score)
        .filter((s): s is number => s !== null && s !== undefined);
      row[t.name] = avg(scores);
    }
    return row;
  });
}

export function classAverageTrend(
  reviews: ReviewWithCriteria[],
  teamScoreRows: TeamScoreExportRow[]
): { review: string; avg: number | null }[] {
  return reviews.map((r) => {
    const scores = teamScoreRows
      .filter((tr) => tr.ReviewNumber === r.number)
      .map((tr) => tr.Score)
      .filter((s): s is number => s !== null && s !== undefined);
    return { review: `R${r.number}`, avg: avg(scores) };
  });
}

export function studentLeaderboard(
  teamScoreRows: TeamScoreExportRow[],
  individualScoreRows: IndividualScoreExportRow[]
): { student: string; team: string; overall: number | null; reviewsScored: number }[] {
  const summary = buildSummaryRows(teamScoreRows, individualScoreRows);
  return overallByStudent(summary)
    .map((r) => ({ student: r.Student, team: r.Team, overall: r.OverallFinalScore, reviewsScored: r.ReviewsScored }))
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

export function categoryBreakdownByReview(
  reviews: ReviewWithCriteria[],
  teamScoreRows: TeamScoreExportRow[]
): { review: string; Build: number | null; Security: number | null }[] {
  return reviews.map((r) => {
    const rows = teamScoreRows.filter((tr) => tr.ReviewNumber === r.number);
    const build = rows.filter((tr) => tr.Category === "Build").map((tr) => tr.Score).filter((s): s is number => s !== null && s !== undefined);
    const security = rows.filter((tr) => tr.Category === "Security").map((tr) => tr.Score).filter((s): s is number => s !== null && s !== undefined);
    return { review: `R${r.number}`, Build: avg(build), Security: avg(security) };
  });
}

export interface HeatmapMatrix {
  teams: string[];
  rows: { criterion: string; category: string; values: (number | null)[] }[];
}

export function criteriaHeatmap(
  classData: ClassData,
  review: ReviewWithCriteria,
  teamScoreRows: TeamScoreExportRow[]
): HeatmapMatrix {
  const teams = classData.teams.map((t) => t.name);
  const rows = review.criteria.map((c) => ({
    criterion: c.text,
    category: c.category,
    values: teams.map((teamName) => {
      const row = teamScoreRows.find(
        (tr) => tr.Team === teamName && tr.ReviewNumber === review.number && tr.Criterion === c.text
      );
      return row?.Score ?? null;
    }),
  }));
  return { teams, rows };
}

export function scoreHistogram(
  teamScoreRows: TeamScoreExportRow[],
  individualScoreRows: IndividualScoreExportRow[]
): { bucket: string; count: number }[] {
  const summary = buildSummaryRows(teamScoreRows, individualScoreRows);
  const buckets = [
    { label: "< 2", test: (n: number) => n < 2 },
    { label: "2-3", test: (n: number) => n >= 2 && n < 3 },
    { label: "3-4", test: (n: number) => n >= 3 && n < 4 },
    { label: "4-5", test: (n: number) => n >= 4 && n < 5 },
    { label: "5+", test: (n: number) => n >= 5 },
  ];
  const finals = summary.map((s) => s.FinalScore).filter((s): s is number => s !== null && s !== undefined);
  return buckets.map((b) => ({ bucket: b.label, count: finals.filter(b.test).length }));
}

export function teamScatterData(
  classData: ClassData,
  teamScoreRows: TeamScoreExportRow[],
  individualScoreRows: IndividualScoreExportRow[]
): { team: string; teamAvg: number | null; avgDelta: number | null }[] {
  return classData.teams.map((t) => {
    const scores = teamScoreRows
      .filter((r) => r.Team === t.name)
      .map((r) => r.Score)
      .filter((s): s is number => s !== null && s !== undefined);
    const deltas = individualScoreRows
      .filter((r) => r.Team === t.name)
      .map((r) => r.Delta)
      .filter((d): d is number => d !== null && d !== undefined);
    // No individual scores yet reads as "no adjustment applied" (0), not a
    // missing point - keeps every team plotted as soon as it has a baseline.
    return { team: t.name, teamAvg: avg(scores), avgDelta: deltas.length > 0 ? avg(deltas) : 0 };
  });
}

export function scoreHealthCounts(
  teamScoreRows: TeamScoreExportRow[],
  reviewNumber: number | "all"
): { label: string; value: number; color: "good" | "warning" | "critical" }[] {
  const rows = reviewNumber === "all" ? teamScoreRows : teamScoreRows.filter((r) => r.ReviewNumber === reviewNumber);
  const scored = rows.filter((r) => r.Score !== null && r.Score !== undefined);
  const low = scored.filter((r) => (r.Score as number) <= 2).length;
  const mid = scored.filter((r) => r.Score === 3).length;
  const high = scored.filter((r) => (r.Score as number) >= 4).length;
  return [
    { label: "High (4-5)", value: high, color: "good" },
    { label: "Mid (3)", value: mid, color: "warning" },
    { label: "Low (1-2)", value: low, color: "critical" },
  ];
}

export interface RadarSeries {
  axes: string[];
  data: Record<string, string | number>[];
  teams: string[];
}

export function radarDataForReview(
  review: ReviewWithCriteria,
  teamScoreRows: TeamScoreExportRow[],
  teamNames: string[]
): RadarSeries {
  const axes = review.criteria.map((c) => c.text);
  const data = review.criteria.map((c) => {
    const point: Record<string, string | number> = {
      axis: c.text.length > 28 ? `${c.text.slice(0, 27)}…` : c.text,
    };
    for (const teamName of teamNames) {
      const row = teamScoreRows.find(
        (tr) => tr.Team === teamName && tr.ReviewNumber === review.number && tr.Criterion === c.text
      );
      point[teamName] = row?.Score ?? 0;
    }
    return point;
  });
  return { axes, data, teams: teamNames };
}
