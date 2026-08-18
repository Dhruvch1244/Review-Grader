import type { ReviewTotalExportRow, StudentGrandTotalExportRow } from "./models/types";

// Pure aggregation logic shared by the server-side export (single class,
// read straight from SQLite) and the browser-side merge tool (many classes,
// read from parsed xlsx files). No DB access here on purpose.

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sums each student's per-review totals into a grand total (earned/max
 * across all 4 reviews, shown for reference) - but Percentage is the
 * average of each *scored* review's own percentage, each review weighted
 * equally at 25% once all 4 are in, regardless of that review's own point
 * total or how much of it has been rated so far. Team-scope sections
 * contribute identically to every student on a team; individual-scope
 * sections (e.g. Presentation) make two teammates' figures genuinely
 * differ. */
export function studentGrandTotals(reviewTotalRows: ReviewTotalExportRow[]): StudentGrandTotalExportRow[] {
  const byStudent = new Map<string, ReviewTotalExportRow[]>();
  for (const row of reviewTotalRows) {
    const key = `${row.Class}::${row.Team}::${row.Student}`;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(row);
  }
  return Array.from(byStudent.entries()).map(([key, rows]) => {
    const [Class, Team, Student] = key.split("::");
    const earned = rows.reduce((sum, r) => sum + r.TotalEarned, 0);
    const max = rows.reduce((sum, r) => sum + r.TotalMax, 0);
    const reviewPcts = rows.filter((r) => r.TotalMax > 0).map((r) => (r.TotalEarned / r.TotalMax) * 100);
    const percentage = reviewPcts.length > 0 ? round2(reviewPcts.reduce((a, b) => a + b, 0) / reviewPcts.length) : null;
    return {
      Class,
      Team,
      Student,
      GrandTotalEarned: round2(earned),
      GrandTotalMax: round2(max),
      Percentage: percentage,
    };
  });
}
