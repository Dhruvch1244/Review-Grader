import * as XLSX from "xlsx";
import { getClassData, listReviews, getScoresForClass } from "./queries";
import { studentGrandTotals } from "./rollup";
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
 * a grand total column. Most marks are team-level (shared across every
 * member), but a few sections (Component Knowledge, Project Knowledge,
 * Presentation) are scored per-student, so two teammates' figures can
 * genuinely differ.
 */
function buildSummarySheet(
  data: ClassData,
  reviewTotalRows: ReviewTotalExportRow[],
  reviewLabels: { number: number; label: string; max: number }[]
): XLSX.WorkSheet {
  const grandByStudent = new Map(studentGrandTotals(reviewTotalRows).map((g) => [`${g.Team}::${g.Student}`, g]));

  const header = ["Team", "Name", ...reviewLabels.map((r) => `${r.label} (${r.max})`), "Grand Total"];
  const rows: (string | number)[][] = [header];
  const merges: XLSX.Range[] = [];
  let rowIdx = 1;

  for (const team of data.teams) {
    const startRow = rowIdx;

    const members = team.students.length > 0 ? team.students : [{ id: "", team_id: team.id, slot_index: 0, name: "—" }];
    for (const student of members) {
      const totalsForStudent = reviewTotalRows.filter((r) => r.Team === team.name && r.Student === student.name);
      const cellFor = (num: number) => {
        const t = totalsForStudent.find((x) => x.ReviewNumber === num);
        return t && t.TotalMax > 0 ? `${t.TotalEarned}/${t.TotalMax}` : "—";
      };
      const grand = grandByStudent.get(`${team.name}::${student.name}`);
      const grandCell =
        grand && grand.GrandTotalMax > 0 ? `${grand.GrandTotalEarned}/${grand.GrandTotalMax} (${grand.Percentage}%)` : "—";
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
  const grandTotals = studentGrandTotals(reviewTotalRows);
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
