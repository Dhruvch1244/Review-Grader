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

export interface ClassRow {
  id: string;
  name: string;
  instructor_name: string | null;
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
  Instructor: string;
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
  FinalScore: number | null;
}
