import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  IndividualScoreRow,
  RosterExportRow,
  TeamScoreExportRow,
  IndividualScoreExportRow,
} from "./types";

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

/**
 * Turns the raw id-keyed rows (as stored/fetched) into the flat,
 * name-keyed export shapes shared by the xlsx export (server) and the
 * stats dashboard (client) - one place computes "which team/review/
 * criterion does this score belong to" instead of two.
 */
export function buildExportRows(
  classData: ClassData,
  reviews: ReviewWithCriteria[],
  teamScores: TeamScoreRow[],
  individualScores: IndividualScoreRow[]
): {
  roster: RosterExportRow[];
  teamScoreRows: TeamScoreExportRow[];
  individualScoreRows: IndividualScoreExportRow[];
} {
  const teamById = new Map(classData.teams.map((t) => [t.id, t]));
  const criterionById = new Map(reviews.flatMap((r) => r.criteria.map((c) => [c.id, c])));
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const studentById = new Map(
    classData.teams.flatMap((t) => t.students.map((s) => [s.id, { ...s, team: t }]))
  );

  const roster: RosterExportRow[] = classData.teams.flatMap((t) =>
    t.students.map((s) => ({
      Class: classData.class.name,
      Reviewer: classData.class.reviewer_name ?? "",
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
        Class: classData.class.name,
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
        Class: classData.class.name,
        Team: student.team.name,
        Student: student.name,
        ReviewNumber: review.number,
        ReviewLabel: review.label,
        Delta: is.delta,
        Notes: is.notes,
      };
    })
    .filter((r): r is IndividualScoreExportRow => r !== null);

  return { roster, teamScoreRows, individualScoreRows };
}
