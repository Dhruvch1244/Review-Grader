import * as XLSX from "xlsx";
import { getClassData, listReviews, getScoresForClass } from "./queries";
import { teamGrandTotals } from "./rollup";
import { buildExportRows } from "./export-rows";
import type { ClassData, ReviewTotalExportRow } from "./types";

const PANELISTS_SHEET: (string | number)[][] = [
  ["Panelist", "Focus", "Expertise"],
  [
    "Panelist 1",
    "Architecture & Backend SME",
    "Java / Spring Boot, Microservices architecture, Kafka, PostgreSQL / relational DB design, JWT & security fundamentals",
  ],
  [
    "Panelist 2",
    "Full Stack & Integration SME",
    "Angular, Full-stack integration thinking, Real-time data patterns, Code quality & testing, Security in web apps",
  ],
  [],
  ["Presentation", "Time Alloted"],
  ["Group", "10 mins per team"],
  ["Individual", "10 mins per person"],
  [],
  ["Group Size", 6],
  ["Total Time per Team", "40 mins (10 group + 30 individual)"],
];

/**
 * The stakeholder-facing summary sheet: one row per person, grouped under
 * their team (team name merged and centered down the block, matching the
 * requested layout), with each of the 4 reviews' earned/possible marks and
 * a grand total column. Marks are team-level - every member of a team
 * shows the same figures since the project is a shared deliverable.
 */
function buildSummarySheet(
  data: ClassData,
  reviewTotalRows: ReviewTotalExportRow[],
  reviewLabels: { number: number; label: string; max: number }[]
): XLSX.WorkSheet {
  const grandByTeam = new Map(teamGrandTotals(reviewTotalRows).map((g) => [g.Team, g]));

  const header = ["Team", "Name", ...reviewLabels.map((r) => `${r.label} (${r.max})`), "Grand Total"];
  const rows: (string | number)[][] = [header];
  const merges: XLSX.Range[] = [];
  let rowIdx = 1;

  for (const team of data.teams) {
    const startRow = rowIdx;
    const totalsForTeam = reviewTotalRows.filter((r) => r.Team === team.name);
    const cellFor = (num: number) => {
      const t = totalsForTeam.find((x) => x.ReviewNumber === num);
      return t && t.TotalMax > 0 ? `${t.TotalEarned}/${t.TotalMax}` : "—";
    };
    const grand = grandByTeam.get(team.name);
    const grandCell =
      grand && grand.GrandTotalMax > 0 ? `${grand.GrandTotalEarned}/${grand.GrandTotalMax} (${grand.Percentage}%)` : "—";

    const members = team.students.length > 0 ? team.students : [{ id: "", team_id: team.id, slot_index: 0, name: "—" }];
    for (const student of members) {
      rows.push([team.name, student.name, ...reviewLabels.map((r) => cellFor(r.number)), grandCell]);
      rowIdx++;
    }
    const endRow = rowIdx - 1;
    if (endRow > startRow) {
      merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 12 }, { wch: 22 }, ...reviewLabels.map(() => ({ wch: 16 })), { wch: 20 }];
  return ws;
}

export function buildClassWorkbook(classId: string): XLSX.WorkBook {
  const data = getClassData(classId);
  if (!data) throw new Error("class not found");
  const reviews = listReviews();
  const { sectionScores, reviewTotals } = getScoresForClass(classId);

  const { roster, sectionScoreRows, reviewTotalRows } = buildExportRows(data, reviews, sectionScores, reviewTotals);
  const grandTotals = teamGrandTotals(reviewTotalRows);
  const reviewLabels = reviews.map((r) => ({
    number: r.number,
    label: r.label,
    max: r.sections.reduce((sum, s) => sum + s.maxMarks, 0),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(PANELISTS_SHEET), "Panelists");
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data, reviewTotalRows, reviewLabels), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roster), "Roster");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sectionScoreRows), "SectionScores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reviewTotalRows), "ReviewTotals");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grandTotals), "GrandTotals");

  return wb;
}
