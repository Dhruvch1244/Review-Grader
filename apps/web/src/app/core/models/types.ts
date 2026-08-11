export type Category = "Build" | "Security";

export interface ReviewDef {
  id: string;
  number: number;
  label: string;
  sprintRange: string;
}

export interface CriterionDef {
  id: string;
  reviewId: string;
  category: Category;
  text: string;
  order: number;
}

/** The 4-band grade used for both dimension scores and asked-question ratings. */
export type GradeBand = "below" | "partial" | "meets" | "exceeds";
export const GRADE_BAND_VALUE: Record<GradeBand, number> = { below: 1, partial: 3, meets: 4, exceeds: 5 };
export const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  below: "Below",
  partial: "Partial",
  meets: "Meets",
  exceeds: "Exceeds",
};

export interface DimensionDef {
  id: string;
  key: string;
  label: string;
  weightPercent: number;
  order: number;
}

/** One reviewer's own grade for one dimension - the raw, per-reviewer row.
 * Displayed scores are computed by averaging these across reviewers
 * client-side (see IndividualAssessmentComponent). */
export interface DimensionScoreRow {
  id: string;
  student_id: string;
  review_id: string;
  dimension_id: string;
  reviewer_id: string;
  score: number;
  updated_at: string;
}

export interface AskedQuestionRow {
  id: string;
  student_id: string;
  review_id: string;
  reviewer_id: string | null;
  text: string;
  rating: GradeBand | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/** A named reviewer on a class's panel (2-3 typical) - not an account, just
 * a label used to attribute and average scores across reviewers. */
export interface ClassReviewerRow {
  id: string;
  class_id: string;
  name: string;
  order_index: number;
}

export interface ClassRow {
  id: string;
  name: string;
  reviewer_name: string | null;
  headcount: number;
  created_at: string;
}

export interface TeamRow {
  id: string;
  class_id: string;
  number: number;
  name: string;
}

export interface StudentRow {
  id: string;
  team_id: string;
  slot_index: number;
  name: string;
}

/** The team's averaged baseline for one criterion - computed by averaging
 * across whichever reviewers have scored it (see getTeamScoresByCriterion).
 * This is the shape every existing consumer (stats, export, rollup,
 * Score/Review pages) expects; it carries no single reviewer's identity. */
export interface TeamScoreRow {
  id: string;
  team_id: string;
  review_id: string;
  criterion_id: string;
  score: number | null;
  notes: string | null;
  updated_at: string;
  raterCount?: number;
}

/** One reviewer's own raw score for one criterion - used only for
 * own-entry highlighting in the Score/Review UI, never for stats/export. */
export interface TeamScoreEntryRow {
  id: string;
  team_id: string;
  review_id: string;
  criterion_id: string;
  reviewer_id: string;
  score: number | null;
  notes: string | null;
  updated_at: string;
}

export interface IndividualScoreRow {
  id: string;
  student_id: string;
  review_id: string;
  delta: number | null;
  notes: string | null;
  grace?: number | null;
  updated_at: string;
}

export type ReviewSessionPhase = "idle" | "presentation" | "individual" | "final" | "done";

export interface ReviewSessionRow {
  id: string;
  team_id: string;
  review_id: string;
  phase: ReviewSessionPhase;
  timer_started_at: string | null;
  timer_duration_seconds: number;
  current_student_index: number;
  updated_at: string;
}

export interface TeamWithStudents extends TeamRow {
  students: StudentRow[];
}

export interface ClassData {
  class: ClassRow;
  teams: TeamWithStudents[];
  reviewers: ClassReviewerRow[];
}

// Flat row shapes used by both the server-side xlsx export and the
// browser-side merge tool, so exported files can be re-parsed and merged.
export interface RosterExportRow {
  Class: string;
  Reviewer: string;
  Team: string;
  Student: string;
}

export interface TeamScoreExportRow {
  Class: string;
  Team: string;
  ReviewNumber: number;
  ReviewLabel: string;
  Category: Category;
  Criterion: string;
  Score: number | null;
  Notes: string | null;
}

export interface IndividualScoreExportRow {
  Class: string;
  Team: string;
  Student: string;
  ReviewNumber: number;
  ReviewLabel: string;
  Delta: number | null;
  Grace: number | null;
  Notes: string | null;
}

export interface SummaryExportRow {
  Class: string;
  Team: string;
  Student: string;
  ReviewNumber: number;
  ReviewLabel: string;
  TeamAvg: number | null;
  Delta: number | null;
  Grace: number | null;
  FinalScore: number | null;
}

// Shapes returned by GET /api/normalize.
export interface ClassNormSummary {
  classId: string;
  className: string;
  mean: number;
  stddev: number;
  studentCount: number;
}

export interface StudentNormRow {
  classId: string;
  className: string;
  team: string;
  student: string;
  raw: number;
  z: number;
  normalized: number;
}
