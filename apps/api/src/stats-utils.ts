import type { ClassData, ReviewDef, ReviewSectionDef, SectionScoreExportRow, ReviewTotalExportRow } from "./types";
import { teamGrandTotals } from "./rollup";

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function pct(earned: number, max: number): number | null {
  return max > 0 ? Math.round((earned / max) * 10000) / 100 : null;
}

/** Each team's overall percentage across every review scored so far. */
export function teamPercentages(
  reviewTotalRows: ReviewTotalExportRow[]
): { team: string; percentage: number | null; reviewsScored: number }[] {
  return teamGrandTotals(reviewTotalRows).map((t) => ({
    team: t.Team,
    percentage: t.Percentage,
    reviewsScored: reviewTotalRows.filter((r) => r.Team === t.Team && r.TotalMax > 0).length,
  }));
}

/** One row per review, each team's percentage for that review specifically
 * (null if the team has no scored sections in that review yet). */
export function teamTrendByReview(
  classData: ClassData,
  reviews: ReviewWithSections[],
  reviewTotalRows: ReviewTotalExportRow[]
): Record<string, number | string | null>[] {
  return reviews.map((r) => {
    const row: Record<string, number | string | null> = { review: `R${r.number}` };
    for (const t of classData.teams) {
      const rt = reviewTotalRows.find((row2) => row2.Team === t.name && row2.ReviewNumber === r.number);
      row[t.name] = rt && rt.TotalMax > 0 ? pct(rt.TotalEarned, rt.TotalMax) : null;
    }
    return row;
  });
}

export function classAverageTrend(
  reviews: ReviewWithSections[],
  reviewTotalRows: ReviewTotalExportRow[]
): { review: string; avg: number | null }[] {
  return reviews.map((r) => {
    const pcts = reviewTotalRows
      .filter((row) => row.ReviewNumber === r.number && row.TotalMax > 0)
      .map((row) => pct(row.TotalEarned, row.TotalMax))
      .filter((p): p is number => p !== null);
    return { review: `R${r.number}`, avg: avg(pcts) };
  });
}

export function teamLeaderboard(
  reviewTotalRows: ReviewTotalExportRow[]
): { team: string; overall: number | null; reviewsScored: number }[] {
  return teamPercentages(reviewTotalRows)
    .map((t) => ({ team: t.team, overall: t.percentage, reviewsScored: t.reviewsScored }))
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

/** Technical vs Non-Technical average percentage per review - only Review 1
 * carries a non-technical component today, so later reviews show
 * NonTechnical: null. */
export function categoryBreakdownByReview(
  reviews: ReviewWithSections[],
  reviewTotalRows: ReviewTotalExportRow[]
): { review: string; Technical: number | null; NonTechnical: number | null }[] {
  return reviews.map((r) => {
    const rows = reviewTotalRows.filter((row) => row.ReviewNumber === r.number && row.TotalMax > 0);
    const techPcts = rows.map((row) => pct(row.TechnicalEarned, row.TechnicalMax)).filter((p): p is number => p !== null);
    const nonTechPcts = rows
      .filter((row) => row.NonTechnicalMax > 0)
      .map((row) => pct(row.NonTechnicalEarned, row.NonTechnicalMax))
      .filter((p): p is number => p !== null);
    return { review: `R${r.number}`, Technical: avg(techPcts), NonTechnical: nonTechPcts.length > 0 ? avg(nonTechPcts) : null };
  });
}

export interface HeatmapMatrix {
  teams: string[];
  rows: { section: string; category: string; values: (number | null)[] }[];
}

/** Teams x sections matrix of percentage-of-max (0-100) for one review. */
export function sectionHeatmap(
  classData: ClassData,
  review: ReviewWithSections,
  sectionScoreRows: SectionScoreExportRow[]
): HeatmapMatrix {
  const teams = classData.teams.map((t) => t.name);
  const rows = review.sections.map((s) => ({
    section: s.label,
    category: s.category,
    values: teams.map((teamName) => {
      const row = sectionScoreRows.find(
        (sr) => sr.Team === teamName && sr.ReviewNumber === review.number && sr.Section === s.label
      );
      return row && row.Score !== null ? pct(row.Score, row.MaxMarks) : null;
    }),
  }));
  return { teams, rows };
}

export function scoreHistogram(reviewTotalRows: ReviewTotalExportRow[]): { bucket: string; count: number }[] {
  const buckets = [
    { label: "< 50%", test: (n: number) => n < 50 },
    { label: "50-65%", test: (n: number) => n >= 50 && n < 65 },
    { label: "65-80%", test: (n: number) => n >= 65 && n < 80 },
    { label: "80-90%", test: (n: number) => n >= 80 && n < 90 },
    { label: "90%+", test: (n: number) => n >= 90 },
  ];
  const pcts = teamGrandTotals(reviewTotalRows)
    .map((t) => t.Percentage)
    .filter((p): p is number => p !== null);
  return buckets.map((b) => ({ bucket: b.label, count: pcts.filter(b.test).length }));
}

/** Technical% vs Non-Technical% for Review 1 - the only review that splits
 * into both categories, so it's the one scatter plot that stays meaningful. */
export function technicalVsNonTechnicalScatter(
  reviewTotalRows: ReviewTotalExportRow[]
): { team: string; technicalPct: number | null; nonTechnicalPct: number | null }[] {
  const r1 = reviewTotalRows.filter((r) => r.ReviewNumber === 1 && r.TotalMax > 0);
  return r1.map((r) => ({
    team: r.Team,
    technicalPct: pct(r.TechnicalEarned, r.TechnicalMax),
    nonTechnicalPct: r.NonTechnicalMax > 0 ? pct(r.NonTechnicalEarned, r.NonTechnicalMax) : null,
  }));
}

/** Low/Mid/High section-score counts per review (by percentage of max),
 * so the health of a class's scoring shows as a trend across R1-R4. */
export function scoreHealthByReview(
  reviews: ReviewWithSections[],
  sectionScoreRows: SectionScoreExportRow[]
): { review: string; Low: number; Mid: number; High: number }[] {
  return reviews.map((r) => {
    const scored = sectionScoreRows.filter((sr) => sr.ReviewNumber === r.number && sr.Score !== null);
    const pcts = scored.map((sr) => pct(sr.Score as number, sr.MaxMarks)!);
    return {
      review: `R${r.number}`,
      Low: pcts.filter((p) => p < 50).length,
      Mid: pcts.filter((p) => p >= 50 && p < 80).length,
      High: pcts.filter((p) => p >= 80).length,
    };
  });
}

export interface RadarSeries {
  axes: string[];
  data: Record<string, string | number>[];
  teams: string[];
}

/** Percentage-of-max per section, per selected team - radar axes are the
 * review's sections. */
export function radarDataForReview(
  review: ReviewWithSections,
  sectionScoreRows: SectionScoreExportRow[],
  teamNames: string[]
): RadarSeries {
  const axes = review.sections.map((s) => s.label);
  const data = review.sections.map((s) => {
    const point: Record<string, string | number> = {
      axis: s.label.length > 28 ? `${s.label.slice(0, 27)}…` : s.label,
    };
    for (const teamName of teamNames) {
      const row = sectionScoreRows.find(
        (sr) => sr.Team === teamName && sr.ReviewNumber === review.number && sr.Section === s.label
      );
      point[teamName] = row && row.Score !== null ? pct(row.Score, row.MaxMarks)! : 0;
    }
    return point;
  });
  return { axes, data, teams: teamNames };
}
