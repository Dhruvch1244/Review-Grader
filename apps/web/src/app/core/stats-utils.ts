import type { ClassData, ReviewDef, ReviewSectionDef, SectionScoreExportRow, ReviewTotalExportRow } from "./models/types";

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(earned: number, max: number): number | null {
  return max > 0 ? Math.round((earned / max) * 10000) / 100 : null;
}

interface TeamReviewAgg {
  Team: string;
  ReviewNumber: number;
  TechnicalEarned: number;
  TechnicalMax: number;
  NonTechnicalEarned: number;
  NonTechnicalMax: number;
  TotalEarned: number;
  TotalMax: number;
}

/**
 * reviewTotalRows is per-STUDENT (team-scope sections contribute the same
 * value to every student, but individual-scope sections vary per person).
 * Every stats chart here is team-level, so this averages a team's students
 * back into one row per (team, review) - the shape the charts below all
 * expect. Max values are identical across a team's students already (the
 * same sections apply to everyone), so averaging them is a no-op; Earned
 * genuinely reflects the team's individual-scope performance on average.
 */
export function aggregateByTeamReview(reviewTotalRows: ReviewTotalExportRow[]): TeamReviewAgg[] {
  const byKey = new Map<string, ReviewTotalExportRow[]>();
  for (const r of reviewTotalRows) {
    const key = `${r.Team}::${r.ReviewNumber}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }
  return Array.from(byKey.entries()).map(([key, rows]) => {
    const [Team, reviewNumberStr] = key.split("::");
    const n = rows.length;
    const sum = (f: (r: ReviewTotalExportRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    return {
      Team,
      ReviewNumber: Number(reviewNumberStr),
      TechnicalEarned: round2(sum((r) => r.TechnicalEarned) / n),
      TechnicalMax: round2(sum((r) => r.TechnicalMax) / n),
      NonTechnicalEarned: round2(sum((r) => r.NonTechnicalEarned) / n),
      NonTechnicalMax: round2(sum((r) => r.NonTechnicalMax) / n),
      TotalEarned: round2(sum((r) => r.TotalEarned) / n),
      TotalMax: round2(sum((r) => r.TotalMax) / n),
    };
  });
}

/** Percentage is the average of each *scored* review's own percentage,
 * each review weighted equally at 25% once all 4 are in - not a ratio of
 * summed points, so a review's own point total (or how much of it is
 * rated so far) doesn't skew the others. earned/max are still summed for
 * reference display. */
export function teamGrandTotals(teamReviewAggs: TeamReviewAgg[]): { team: string; earned: number; max: number; percentage: number | null }[] {
  const byTeam = new Map<string, TeamReviewAgg[]>();
  for (const r of teamReviewAggs) {
    if (!byTeam.has(r.Team)) byTeam.set(r.Team, []);
    byTeam.get(r.Team)!.push(r);
  }
  return Array.from(byTeam.entries()).map(([team, rows]) => {
    const earned = rows.reduce((s, r) => s + r.TotalEarned, 0);
    const max = rows.reduce((s, r) => s + r.TotalMax, 0);
    const reviewPcts = rows.filter((r) => r.TotalMax > 0).map((r) => (r.TotalEarned / r.TotalMax) * 100);
    const percentage = reviewPcts.length > 0 ? round2(reviewPcts.reduce((a, b) => a + b, 0) / reviewPcts.length) : null;
    return { team, earned: round2(earned), max: round2(max), percentage };
  });
}

/** Each team's overall percentage across every review scored so far
 * (averaged across its students where individual-scope sections apply). */
export function teamPercentages(
  reviewTotalRows: ReviewTotalExportRow[]
): { team: string; percentage: number | null; reviewsScored: number }[] {
  const teamReviewAggs = aggregateByTeamReview(reviewTotalRows);
  return teamGrandTotals(teamReviewAggs).map((t) => ({
    team: t.team,
    percentage: t.percentage,
    reviewsScored: teamReviewAggs.filter((r) => r.Team === t.team && r.TotalMax > 0).length,
  }));
}

/** One row per review, each team's percentage for that review specifically
 * (null if the team has no scored sections in that review yet). */
export function teamTrendByReview(
  classData: ClassData,
  reviews: ReviewWithSections[],
  reviewTotalRows: ReviewTotalExportRow[]
): Record<string, number | string | null>[] {
  const teamReviewAggs = aggregateByTeamReview(reviewTotalRows);
  return reviews.map((r) => {
    const row: Record<string, number | string | null> = { review: `R${r.number}` };
    for (const t of classData.teams) {
      const rt = teamReviewAggs.find((row2) => row2.Team === t.name && row2.ReviewNumber === r.number);
      row[t.name] = rt && rt.TotalMax > 0 ? pct(rt.TotalEarned, rt.TotalMax) : null;
    }
    return row;
  });
}

export function classAverageTrend(
  reviews: ReviewWithSections[],
  reviewTotalRows: ReviewTotalExportRow[]
): { review: string; avg: number | null }[] {
  const teamReviewAggs = aggregateByTeamReview(reviewTotalRows);
  return reviews.map((r) => {
    const pcts = teamReviewAggs
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
  const teamReviewAggs = aggregateByTeamReview(reviewTotalRows);
  return reviews.map((r) => {
    const rows = teamReviewAggs.filter((row) => row.ReviewNumber === r.number && row.TotalMax > 0);
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

/** A team's average score for one section in one review - a single row for
 * team-scope sections, averaged across students for individual-scope ones. */
function avgSectionScoreForTeam(
  sectionScoreRows: SectionScoreExportRow[],
  teamName: string,
  reviewNumber: number,
  sectionLabel: string
): number | null {
  const rows = sectionScoreRows.filter(
    (sr) => sr.Team === teamName && sr.ReviewNumber === reviewNumber && sr.Section === sectionLabel && sr.Score !== null
  );
  if (rows.length === 0) return null;
  return round2(rows.reduce((s, r) => s + (r.Score as number), 0) / rows.length);
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
      const score = avgSectionScoreForTeam(sectionScoreRows, teamName, review.number, s.label);
      return score !== null ? pct(score, s.maxMarks) : null;
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
  const teamReviewAggs = aggregateByTeamReview(reviewTotalRows);
  const pcts = teamGrandTotals(teamReviewAggs)
    .map((t) => t.percentage)
    .filter((p): p is number => p !== null);
  return buckets.map((b) => ({ bucket: b.label, count: pcts.filter(b.test).length }));
}

/** Technical% vs Non-Technical% for Review 1 - the only review that splits
 * into both categories, so it's the one scatter plot that stays meaningful. */
export function technicalVsNonTechnicalScatter(
  reviewTotalRows: ReviewTotalExportRow[]
): { team: string; technicalPct: number | null; nonTechnicalPct: number | null }[] {
  const r1 = aggregateByTeamReview(reviewTotalRows).filter((r) => r.ReviewNumber === 1 && r.TotalMax > 0);
  return r1.map((r) => ({
    team: r.Team,
    technicalPct: pct(r.TechnicalEarned, r.TechnicalMax),
    nonTechnicalPct: r.NonTechnicalMax > 0 ? pct(r.NonTechnicalEarned, r.NonTechnicalMax) : null,
  }));
}

/** Low/Mid/High section-score counts per review (by percentage of max),
 * so the health of a class's scoring shows as a trend across R1-R4. Each
 * student's individual-scope rating counts separately (not averaged), so
 * this reflects real spread across people, not just teams. */
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
      const score = avgSectionScoreForTeam(sectionScoreRows, teamName, review.number, s.label);
      point[teamName] = score !== null ? pct(score, s.maxMarks)! : 0;
    }
    return point;
  });
  return { axes, data, teams: teamNames };
}
