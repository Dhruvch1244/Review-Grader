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
  guidance?: string | null;
}

export type QuestionRating = "answered" | "middle" | "unanswered";

export interface QuestionVariant {
  id: string;
  criterionId: string;
  text: string;
  order: number;
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

export interface QuestionRatingRow {
  id: string;
  student_id: string;
  review_id: string;
  criterion_id: string;
  rating: QuestionRating;
  updated_at: string;
}

export interface QuestionSessionRow {
  id: string;
  student_id: string;
  review_id: string;
  criterion_ids: string[];
  created_at: string;
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

// Shape of a question returned by GET/POST /api/question-sessions - the
// question-generation logic itself is server-only, but the client needs
// this type to render what comes back.
export interface GeneratedQuestion {
  criterionId: string;
  category: Category;
  criterionText: string;
  question: string;
  guidance: string;
  teamScore: number | null;
  weak: boolean;
}

// Shape returned by GET /api/question-bank.
export interface QuestionBankCriterion {
  id: string;
  reviewId: string;
  reviewLabel: string;
  category: Category;
  text: string;
  guidance: string | null;
  questions: QuestionVariant[];
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
