export type SectionCategory = "technical" | "non_technical";

/** 'team' sections get one shared score for the whole team (the project is
 * a team deliverable); 'individual' sections (e.g. Component Knowledge,
 * Presentation) are scored separately per student on the team. */
export type SectionScope = "team" | "individual";

/** 'subtopic' sections break down into reviewer-addable subtopics rated on
 * the 4-band scale, averaged and scaled to maxMarks (the default for most
 * sections). 'direct' sections (Component Knowledge, Project Knowledge)
 * skip subtopics entirely - each reviewer just types a raw number 0..
 * maxMarks, averaged across reviewers. */
export type ScoreMode = "subtopic" | "direct";

export interface ReviewDef {
  id: string;
  number: number;
  label: string;
  sprintRange: string;
}

/** A marks-based section of a review (e.g. "Database Design and Modeling" -
 * 10 marks). Admin-editable label/marks; scored indirectly via subtopics
 * (or directly, for 'direct' scoreMode sections). */
export interface ReviewSectionDef {
  id: string;
  reviewId: string;
  key: string;
  label: string;
  category: SectionCategory;
  scope: SectionScope;
  scoreMode: ScoreMode;
  maxMarks: number;
  order: number;
}

/** The 4-band grade used to rate a subtopic. Below=1, Partial=2, Meets=3,
 * Exceeds=4 - linear, so a section's score is simply
 * maxMarks * (avgBandAcrossSubtopics / 4). */
export type GradeBand = "below" | "partial" | "meets" | "exceeds";
export const GRADE_BAND_VALUE: Record<GradeBand, number> = { below: 1, partial: 2, meets: 3, exceeds: 4 };
export const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  below: "Below",
  partial: "Partial",
  meets: "Meets",
  exceeds: "Exceeds",
};

/** A reviewer-addable breakdown of a section, shared across the whole
 * review (not per-team) - every team is judged against the same subtopic
 * once someone adds it. */
export interface SubtopicDef {
  id: string;
  sectionId: string;
  label: string;
  order: number;
  createdAt: string;
}

/** One reviewer's own 4-band rating of one subtopic, for one team - and,
 * for 'individual' scope sections, one specific student on that team
 * (student_id is null for 'team' scope sections, where the mark is shared
 * across the whole team). */
export interface SubtopicScoreRow {
  id: string;
  subtopic_id: string;
  team_id: string;
  student_id: string | null;
  reviewer_id: string;
  band: GradeBand;
  updated_at: string;
}

/** One reviewer's own raw number (0..maxMarks) for a 'direct' scoreMode
 * section - no subtopic breakdown, just a mark. Same team/student-scope
 * split as SubtopicScoreRow; averaged across whichever reviewers have
 * entered one. */
export interface DirectScoreRow {
  id: string;
  section_id: string;
  team_id: string;
  student_id: string | null;
  reviewer_id: string;
  score: number;
  updated_at: string;
}

/** A named reviewer - global roster, not per-class. Not an account, just a
 * label used to attribute and average scores, and to self-select into
 * (class, review) pairs via ReviewReviewerRow. */
export interface ReviewerRow {
  id: string;
  name: string;
  order_index: number;
}

/** A reviewer opting in to score a specific class's specific review. */
export interface ReviewReviewerRow {
  id: string;
  class_id: string;
  review_id: string;
  reviewer_id: string;
}

/** A section's computed score for one team+review (studentId null for
 * 'team' scope sections) or one student+team+review ('individual' scope):
 * the average band across whichever subtopics have at least one rating,
 * scaled to maxMarks. `score` is null until at least one subtopic under the
 * section has been rated. */
export interface SectionScoreRow {
  sectionId: string;
  teamId: string;
  studentId: string | null;
  reviewId: string;
  score: number | null;
  maxMarks: number;
  ratedSubtopics: number;
  totalSubtopics: number;
}

/** One student's rolled-up totals for one review: technical/non-technical/
 * grand "earned so far" out of "possible so far" (only sections with at
 * least one rated subtopic count toward "possible", so an unstarted review
 * reads as 0/0 rather than 0/100). 'team' scope sections contribute the
 * same value to every student on the team; 'individual' scope sections
 * (e.g. Presentation) contribute that student's own score - so two
 * teammates can have different totals for the same review. */
export interface ReviewTotalRow {
  teamId: string;
  studentId: string;
  reviewId: string;
  technicalEarned: number;
  technicalMax: number;
  nonTechnicalEarned: number;
  nonTechnicalMax: number;
  totalEarned: number;
  totalMax: number;
}

/** A team's weakest-rated subtopics across every review scored so far -
 * replaces the old per-student Q&A log entirely. Pools ratings across all
 * students on the team for individual-scope sections (a broad "where to
 * probe" signal, not attributed to one person). */
export interface WeakTopicRow {
  subtopicId: string;
  subtopicLabel: string;
  sectionId: string;
  sectionLabel: string;
  reviewId: string;
  reviewLabel: string;
  teamId: string;
  avgBand: number;
  ratingCount: number;
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

export type ReviewSessionPhase = "idle" | "presentation" | "scoring" | "done";

export interface ReviewSessionRow {
  id: string;
  team_id: string;
  review_id: string;
  phase: ReviewSessionPhase;
  timer_started_at: string | null;
  timer_duration_seconds: number;
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
  Team: string;
  Student: string;
}

export interface SectionScoreExportRow {
  Class: string;
  Team: string;
  Student: string | null;
  ReviewNumber: number;
  ReviewLabel: string;
  Category: SectionCategory;
  Scope: SectionScope;
  Section: string;
  MaxMarks: number;
  Score: number | null;
  RatedSubtopics: number;
  TotalSubtopics: number;
}

export interface ReviewTotalExportRow {
  Class: string;
  Team: string;
  Student: string;
  ReviewNumber: number;
  ReviewLabel: string;
  TechnicalEarned: number;
  TechnicalMax: number;
  NonTechnicalEarned: number;
  NonTechnicalMax: number;
  TotalEarned: number;
  TotalMax: number;
}

export interface StudentGrandTotalExportRow {
  Class: string;
  Team: string;
  Student: string;
  GrandTotalEarned: number;
  GrandTotalMax: number;
  Percentage: number | null;
}

// Shapes returned by GET /api/normalize.
export interface ClassNormSummary {
  classId: string;
  className: string;
  mean: number;
  stddev: number;
  teamCount: number;
}

export interface TeamNormRow {
  classId: string;
  className: string;
  team: string;
  raw: number;
  z: number;
  normalized: number;
}
