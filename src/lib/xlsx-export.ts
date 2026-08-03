import * as XLSX from "xlsx";
import { getClassData, listReviews, getScoresForClass } from "./queries";
import { buildSummaryRows, overallByStudent } from "./rollup";
import type {
  RosterExportRow,
  TeamScoreExportRow,
  IndividualScoreExportRow,
} from "./types";

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

  const teamById = new Map(data.teams.map((t) => [t.id, t]));
  const criterionById = new Map(reviews.flatMap((r) => r.criteria.map((c) => [c.id, { ...c, review: r }])));
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const studentById = new Map(data.teams.flatMap((t) => t.students.map((s) => [s.id, { ...s, team: t }])));

  const roster: RosterExportRow[] = data.teams.flatMap((t) =>
    t.students.map((s) => ({
      Class: data.class.name,
      Instructor: data.class.instructor_name ?? "",
      Team: t.name,
      Student: s.name,
    }))
  );

  const teamScoreRows: TeamScoreExportRow[] = teamScores
    .map((ts) => {
      const team = teamById.get(ts.team_id);
      const crit = criterionById.get(ts.criterion_id);
      const review = reviewById.get(ts.review_id);
      if (!team || !crit || !review) return null;
      return {
        Class: data.class.name,
        Team: team.name,
        ReviewNumber: review.number,
        ReviewLabel: review.label,
        Category: crit.category,
        Criterion: crit.text,
        Score: ts.score,
        Notes: ts.notes,
      };
    })
    .filter((r): r is TeamScoreExportRow => r !== null);

  const individualScoreRows: IndividualScoreExportRow[] = individualScores
    .map((is) => {
      const student = studentById.get(is.student_id);
      const review = reviewById.get(is.review_id);
      if (!student || !review) return null;
      return {
        Class: data.class.name,
        Team: student.team.name,
        Student: student.name,
        ReviewNumber: review.number,
        ReviewLabel: review.label,
        Delta: is.delta,
        Notes: is.notes,
      };
    })
    .filter((r): r is IndividualScoreExportRow => r !== null);

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
