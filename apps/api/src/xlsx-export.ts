import * as XLSX from "xlsx";
import { getClassData, listReviews, getScoresForClass } from "./queries";
import { studentGrandTotals } from "./rollup";
import { buildExportRows } from "./export-rows";
import type { ClassData, ReviewDef, ReviewSectionDef, ReviewTotalExportRow, SectionScoreRow } from "./types";

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

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

/**
 * Per-review sheet matching the stakeholder's own "CAPSTONE PROJECT
 * EVALUATION" template exactly: a merged title row, Technical/Non-Technical
 * category headers (with their live point totals), Team Based/Individual
 * sub-headers, then one column per section labeled "Label(marks)", one row
 * per student (team name merged down the block, like the Summary sheet),
 * and a blank Comments column for the reviewer to fill in by hand. Column
 * layout - and therefore every merge width - is derived from the review's
 * actual sections, not hardcoded, so it holds up under admin edits.
 */
function buildReviewDetailSheet(
  data: ClassData,
  review: ReviewWithSections,
  sectionScores: SectionScoreRow[]
): XLSX.WorkSheet {
  const groups = {
    techTeam: review.sections.filter((s) => s.category === "technical" && s.scope === "team"),
    techIndividual: review.sections.filter((s) => s.category === "technical" && s.scope === "individual"),
    nonTechTeam: review.sections.filter((s) => s.category === "non_technical" && s.scope === "team"),
    nonTechIndividual: review.sections.filter((s) => s.category === "non_technical" && s.scope === "individual"),
  };
  const sectionCols = [...groups.techTeam, ...groups.techIndividual, ...groups.nonTechTeam, ...groups.nonTechIndividual];
  const techMax = groups.techTeam.concat(groups.techIndividual).reduce((sum, s) => sum + s.maxMarks, 0);
  const nonTechMax = groups.nonTechTeam.concat(groups.nonTechIndividual).reduce((sum, s) => sum + s.maxMarks, 0);

  // Column indices: A=Team, B=Member Name, C..=sections, last=Comments.
  const TEAM_COL = 0;
  const NAME_COL = 1;
  const FIRST_SECTION_COL = 2;
  const LAST_SECTION_COL = FIRST_SECTION_COL + sectionCols.length - 1;
  const COMMENTS_COL = LAST_SECTION_COL + 1;
  const HEADER_ROWS = 4;

  const rows: (string | number)[][] = [
    new Array(COMMENTS_COL + 1).fill(""),
    new Array(COMMENTS_COL + 1).fill(""),
    new Array(COMMENTS_COL + 1).fill(""),
    new Array(COMMENTS_COL + 1).fill(""),
  ];
  rows[0][TEAM_COL] = "Team";
  rows[0][NAME_COL] = "Member Name";
  rows[0][FIRST_SECTION_COL] = "CAPSTONE PROJECT EVALUATION";
  rows[0][COMMENTS_COL] = "Comments";
  rows[1][FIRST_SECTION_COL] = `Technical Skills(${techMax})`;
  rows[1][FIRST_SECTION_COL + groups.techTeam.length + groups.techIndividual.length] = `Non Technical Skills(${nonTechMax})`;
  let col = FIRST_SECTION_COL;
  for (const [group, label] of [
    [groups.techTeam, "Team Based"],
    [groups.techIndividual, "Individual"],
    [groups.nonTechTeam, "Team Based"],
    [groups.nonTechIndividual, "Individual"],
  ] as const) {
    if (group.length > 0) rows[2][col] = label;
    for (const section of group) {
      rows[3][col] = `${section.label}(${section.maxMarks})`;
      col++;
    }
  }

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: TEAM_COL }, e: { r: HEADER_ROWS - 1, c: TEAM_COL } },
    { s: { r: 0, c: NAME_COL }, e: { r: HEADER_ROWS - 1, c: NAME_COL } },
    { s: { r: 0, c: COMMENTS_COL }, e: { r: HEADER_ROWS - 1, c: COMMENTS_COL } },
  ];
  if (sectionCols.length > 1) merges.push({ s: { r: 0, c: FIRST_SECTION_COL }, e: { r: 0, c: LAST_SECTION_COL } });
  const categoryRanges: [number, number][] = [
    [FIRST_SECTION_COL, FIRST_SECTION_COL + groups.techTeam.length + groups.techIndividual.length - 1],
    [
      FIRST_SECTION_COL + groups.techTeam.length + groups.techIndividual.length,
      LAST_SECTION_COL,
    ],
  ];
  for (const [start, end] of categoryRanges) {
    if (end > start) merges.push({ s: { r: 1, c: start }, e: { r: 1, c: end } });
  }
  col = FIRST_SECTION_COL;
  for (const group of [groups.techTeam, groups.techIndividual, groups.nonTechTeam, groups.nonTechIndividual]) {
    if (group.length > 1) merges.push({ s: { r: 2, c: col }, e: { r: 2, c: col + group.length - 1 } });
    col += group.length;
  }

  let rowIdx = HEADER_ROWS;
  for (const team of data.teams) {
    const startRow = rowIdx;
    const members = team.students.length > 0 ? team.students : [{ id: "", team_id: team.id, slot_index: 0, name: "—" }];
    for (const student of members) {
      const row: (string | number)[] = new Array(COMMENTS_COL + 1).fill("");
      row[TEAM_COL] = team.name;
      row[NAME_COL] = student.name;
      sectionCols.forEach((section, i) => {
        const ss = sectionScores.find(
          (s) =>
            s.sectionId === section.id &&
            s.teamId === team.id &&
            (section.scope === "team" ? s.studentId === null : s.studentId === student.id)
        );
        row[FIRST_SECTION_COL + i] = ss && ss.score !== null ? ss.score : "";
      });
      rows.push(row);
      rowIdx++;
    }
    const endRow = rowIdx - 1;
    if (endRow > startRow) merges.push({ s: { r: startRow, c: TEAM_COL }, e: { r: endRow, c: TEAM_COL } });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 12 },
    { wch: 22 },
    ...sectionCols.map(() => ({ wch: 18 })),
    { wch: 24 },
  ];
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
  for (const review of reviews) {
    XLSX.utils.book_append_sheet(wb, buildReviewDetailSheet(data, review, sectionScores), `Review ${review.number}`);
  }
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data, reviewTotalRows, reviewLabels), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roster), "Roster");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sectionScoreRows), "SectionScores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reviewTotalRows), "ReviewTotals");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grandTotals), "GrandTotals");

  return wb;
}
