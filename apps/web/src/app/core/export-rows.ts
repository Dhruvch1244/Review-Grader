import type {
  ClassData,
  ReviewDef,
  ReviewSectionDef,
  SectionScoreRow,
  ReviewTotalRow,
  RosterExportRow,
  SectionScoreExportRow,
  ReviewTotalExportRow,
} from "./models/types";

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

/**
 * Turns the raw id-keyed rows (as stored/computed) into the flat,
 * name-keyed export shapes shared by the xlsx export (server) and the
 * stats dashboard (client) - one place computes "which team/student/
 * review/section does this score belong to" instead of two.
 */
export function buildExportRows(
  classData: ClassData,
  reviews: ReviewWithSections[],
  sectionScores: SectionScoreRow[],
  reviewTotals: ReviewTotalRow[]
): {
  roster: RosterExportRow[];
  sectionScoreRows: SectionScoreExportRow[];
  reviewTotalRows: ReviewTotalExportRow[];
} {
  const teamById = new Map(classData.teams.map((t) => [t.id, t]));
  const studentById = new Map(classData.teams.flatMap((t) => t.students.map((s) => [s.id, s])));
  const sectionById = new Map(reviews.flatMap((r) => r.sections.map((s) => [s.id, s])));
  const reviewById = new Map(reviews.map((r) => [r.id, r]));

  const roster: RosterExportRow[] = classData.teams.flatMap((t) =>
    t.students.map((s) => ({
      Class: classData.class.name,
      Team: t.name,
      Student: s.name,
    }))
  );

  const sectionScoreRows: SectionScoreExportRow[] = sectionScores
    .map((ss) => {
      const team = teamById.get(ss.teamId);
      const section = sectionById.get(ss.sectionId);
      const review = reviewById.get(ss.reviewId);
      if (!team || !section || !review) return null;
      const student = ss.studentId ? studentById.get(ss.studentId) : undefined;
      return {
        Class: classData.class.name,
        Team: team.name,
        Student: student ? student.name : null,
        ReviewNumber: review.number,
        ReviewLabel: review.label,
        Category: section.category,
        Scope: section.scope,
        Section: section.label,
        MaxMarks: section.maxMarks,
        Score: ss.score,
        RatedSubtopics: ss.ratedSubtopics,
        TotalSubtopics: ss.totalSubtopics,
      };
    })
    .filter((r): r is SectionScoreExportRow => r !== null);

  const reviewTotalRows: ReviewTotalExportRow[] = reviewTotals
    .map((rt) => {
      const team = teamById.get(rt.teamId);
      const student = studentById.get(rt.studentId);
      const review = reviewById.get(rt.reviewId);
      if (!team || !student || !review) return null;
      return {
        Class: classData.class.name,
        Team: team.name,
        Student: student.name,
        ReviewNumber: review.number,
        ReviewLabel: review.label,
        TechnicalEarned: rt.technicalEarned,
        TechnicalMax: rt.technicalMax,
        NonTechnicalEarned: rt.nonTechnicalEarned,
        NonTechnicalMax: rt.nonTechnicalMax,
        TotalEarned: rt.totalEarned,
        TotalMax: rt.totalMax,
      };
    })
    .filter((r): r is ReviewTotalExportRow => r !== null);

  return { roster, sectionScoreRows, reviewTotalRows };
}
