import * as XLSX from "xlsx";
import { getClassData, listReviews, getScoresForClass } from "./queries";
import { buildSummaryRows, overallByStudent } from "./rollup";
import { buildExportRows } from "./export-rows";

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

export function buildClassWorkbook(classId: string): XLSX.WorkBook {
  const data = getClassData(classId);
  if (!data) throw new Error("class not found");
  const reviews = listReviews();
  const { teamScores, individualScores } = getScoresForClass(classId);

  const { roster, teamScoreRows, individualScoreRows } = buildExportRows(
    data,
    reviews,
    teamScores,
    individualScores
  );

  const summaryRows = buildSummaryRows(teamScoreRows, individualScoreRows);
  const overallRows = overallByStudent(summaryRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(PANELISTS_SHEET), "Panelists");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roster), "Roster");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamScoreRows), "TeamScores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(individualScoreRows), "IndividualScores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overallRows), "Overall");

  return wb;
}
