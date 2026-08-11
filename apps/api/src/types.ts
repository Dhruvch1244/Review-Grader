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

export interface DimensionScoreRow {
  id: string;
  student_id: string;
  review_id: string;
  dimension_id: string;
  score: number;
  updated_at: string;
}

export interface AskedQuestionRow {
  id: string;
  student_id: string;
  review_id: string;
  text: string;
  rating: GradeBand | null;
  order_index: number;
  created_at: string;
  updated_at: string;
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

export interface TeamScoreRow {
  id: string;
  team_id: string;
  review_id: string;
  criterion_id: string;
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
