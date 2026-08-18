import type { ReviewTotalExportRow, TeamGrandTotalExportRow } from "./types";

// Pure aggregation logic shared by the server-side export (single class,
// read straight from SQLite) and the browser-side merge tool (many classes,
// read from parsed xlsx files). No DB access here on purpose.

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sums each team's per-review totals into one grand total (earned/max
 * across all 4 reviews) plus a percentage - only reviews with at least
 * some score contribute to "possible", so an untouched review doesn't drag
 * the percentage down to 0. */
export function teamGrandTotals(reviewTotalRows: ReviewTotalExportRow[]): TeamGrandTotalExportRow[] {
  const byTeam = new Map<string, ReviewTotalExportRow[]>();
  for (const row of reviewTotalRows) {
    const key = `${row.Class}::${row.Team}`;
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(row);
  }
  return Array.from(byTeam.entries()).map(([key, rows]) => {
    const [Class, Team] = key.split("::");
    const earned = rows.reduce((sum, r) => sum + r.TotalEarned, 0);
    const max = rows.reduce((sum, r) => sum + r.TotalMax, 0);
    return {
      Class,
      Team,
      GrandTotalEarned: round2(earned),
      GrandTotalMax: round2(max),
      Percentage: max > 0 ? round2((earned / max) * 100) : null,
    };
  });
}
