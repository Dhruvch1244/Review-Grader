import { randomUUID } from "crypto";
import { getDb } from "./db";
import type {
  ClassRow,
  TeamRow,
  StudentRow,
  ClassData,
  TeamWithStudents,
  TeamScoreRow,
  IndividualScoreRow,
  ReviewDef,
  CriterionDef,
  Category,
  QuestionVariant,
  QuestionSessionRow,
  QuestionRatingRow,
  QuestionRating,
  ReviewSessionRow,
} from "./types";

export function listClasses(): ClassRow[] {
  return getDb().prepare("SELECT * FROM classes ORDER BY name").all() as ClassRow[];
}

export function getClassData(classId: string): ClassData | null {
  const db = getDb();
  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(classId) as ClassRow | undefined;
  if (!cls) return null;
  const teams = db
    .prepare("SELECT * FROM teams WHERE class_id = ? ORDER BY number")
    .all(classId) as TeamRow[];
  const students = db
    .prepare(
      `SELECT s.* FROM students s JOIN teams t ON s.team_id = t.id WHERE t.class_id = ? ORDER BY t.number, s.slot_index`
    )
    .all(classId) as StudentRow[];
  const teamsWithStudents: TeamWithStudents[] = teams.map((t) => ({
    ...t,
    students: students.filter((s) => s.team_id === t.id),
  }));
  return { class: cls, teams: teamsWithStudents };
}

export function renameStudent(studentId: string, name: string): void {
  getDb().prepare("UPDATE students SET name = ? WHERE id = ?").run(name, studentId);
}

/**
 * One-shot roster import: fills every team in the class sequentially
 * (Team 1's slots, then Team 2's, ...) from a single flat name list, so a
 * reviewer can paste the whole class roster once and apply it in one go.
 * Leftover names beyond the class's total slots are ignored; the caller
 * surfaces the counts.
 */
export function bulkAutofillClass(
  classId: string,
  names: string[]
): { classData: ClassData; applied: number; totalSlots: number } {
  const db = getDb();
  const teams = db
    .prepare("SELECT * FROM teams WHERE class_id = ? ORDER BY number")
    .all(classId) as TeamRow[];
  const update = db.prepare("UPDATE students SET name = ? WHERE id = ?");
  let applied = 0;
  let totalSlots = 0;
  const tx = db.transaction(() => {
    let idx = 0;
    for (const team of teams) {
      const students = db
        .prepare("SELECT * FROM students WHERE team_id = ? ORDER BY slot_index")
        .all(team.id) as StudentRow[];
      for (const s of students) {
        totalSlots++;
        const name = names[idx]?.trim();
        if (name) {
          update.run(name, s.id);
          applied++;
        }
        idx++;
      }
    }
  });
  tx();
  return { classData: getClassData(classId)!, applied, totalSlots };
}

export function reassignStudentTeam(studentId: string, teamId: string): void {
  const db = getDb();
  const maxSlot = (
    db.prepare("SELECT MAX(slot_index) as m FROM students WHERE team_id = ?").get(teamId) as {
      m: number | null;
    }
  ).m;
  db.prepare("UPDATE students SET team_id = ?, slot_index = ? WHERE id = ?").run(
    teamId,
    (maxSlot ?? 0) + 1,
    studentId
  );
}

// ---- Roster management: add/remove teams and students ----

export function addTeam(classId: string): TeamWithStudents {
  const db = getDb();
  const maxNumber =
    (db.prepare("SELECT MAX(number) as m FROM teams WHERE class_id = ?").get(classId) as { m: number | null })
      .m ?? 0;
  const teamId = randomUUID();
  const number = maxNumber + 1;
  db.prepare("INSERT INTO teams (id, class_id, number, name) VALUES (?, ?, ?, ?)").run(
    teamId,
    classId,
    number,
    `Team ${number}`
  );
  return { id: teamId, class_id: classId, number, name: `Team ${number}`, students: [] };
}

export function deleteTeam(teamId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    const students = db.prepare("SELECT id FROM students WHERE team_id = ?").all(teamId) as { id: string }[];
    for (const s of students) {
      db.prepare("DELETE FROM individual_scores WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM question_ratings WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM question_sessions WHERE student_id = ?").run(s.id);
    }
    db.prepare("DELETE FROM students WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM team_scores WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM review_sessions WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  });
  tx();
}

export function addStudent(teamId: string, name?: string): StudentRow {
  const db = getDb();
  const maxSlot =
    (db.prepare("SELECT MAX(slot_index) as m FROM students WHERE team_id = ?").get(teamId) as {
      m: number | null;
    }).m ?? 0;
  const id = randomUUID();
  const slot_index = maxSlot + 1;
  const finalName = name ?? "New Student";
  db.prepare("INSERT INTO students (id, team_id, slot_index, name) VALUES (?, ?, ?, ?)").run(
    id,
    teamId,
    slot_index,
    finalName
  );
  return { id, team_id: teamId, slot_index, name: finalName };
}

export function deleteStudent(studentId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM individual_scores WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM question_ratings WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM question_sessions WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM students WHERE id = ?").run(studentId);
  });
  tx();
}

// ---- Rubric / reviews ----

export function listReviews(): (ReviewDef & { criteria: CriterionDef[] })[] {
  const db = getDb();
  const reviews = db.prepare("SELECT * FROM reviews ORDER BY number").all() as {
    id: string;
    number: number;
    label: string;
    sprint_range: string;
  }[];
  const criteria = db.prepare("SELECT * FROM criteria ORDER BY review_id, order_index").all() as {
    id: string;
    review_id: string;
    category: Category;
    text: string;
    order_index: number;
    guidance: string | null;
  }[];
  return reviews.map((r) => ({
    id: r.id,
    number: r.number,
    label: r.label,
    sprintRange: r.sprint_range,
    criteria: criteria
      .filter((c) => c.review_id === r.id)
      .map((c) => ({
        id: c.id,
        reviewId: c.review_id,
        category: c.category,
        text: c.text,
        order: c.order_index,
        guidance: c.guidance,
      })),
  }));
}

// ---- Scoring ----

export function upsertTeamScore(input: {
  teamId: string;
  reviewId: string;
  criterionId: string;
  score: number | null;
  notes: string | null;
}): TeamScoreRow {
  const db = getDb();
  const id = `${input.teamId}:${input.reviewId}:${input.criterionId}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO team_scores (id, team_id, review_id, criterion_id, score, notes, updated_at)
     VALUES (@id, @teamId, @reviewId, @criterionId, @score, @notes, @now)
     ON CONFLICT(team_id, review_id, criterion_id)
     DO UPDATE SET score = @score, notes = @notes, updated_at = @now`
  ).run({ id, ...input, now });
  return db.prepare("SELECT * FROM team_scores WHERE id = ?").get(id) as TeamScoreRow;
}

export function upsertIndividualScore(input: {
  studentId: string;
  reviewId: string;
  delta: number | null;
  notes: string | null;
}): IndividualScoreRow {
  const db = getDb();
  const id = `${input.studentId}:${input.reviewId}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO individual_scores (id, student_id, review_id, delta, notes, updated_at)
     VALUES (@id, @studentId, @reviewId, @delta, @notes, @now)
     ON CONFLICT(student_id, review_id)
     DO UPDATE SET delta = @delta, notes = @notes, updated_at = @now`
  ).run({ id, ...input, now });
  return db.prepare("SELECT * FROM individual_scores WHERE id = ?").get(id) as IndividualScoreRow;
}

export function getTeamScoresByCriterion(teamId: string, reviewId: string): Record<string, TeamScoreRow> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM team_scores WHERE team_id = ? AND review_id = ?")
    .all(teamId, reviewId) as TeamScoreRow[];
  return Object.fromEntries(rows.map((r) => [r.criterion_id, r]));
}

export function upsertGrace(studentId: string, reviewId: string, grace: number | null): IndividualScoreRow {
  const db = getDb();
  const id = `${studentId}:${reviewId}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO individual_scores (id, student_id, review_id, grace, updated_at)
     VALUES (@id, @studentId, @reviewId, @grace, @now)
     ON CONFLICT(student_id, review_id) DO UPDATE SET grace = @grace, updated_at = @now`
  ).run({ id, studentId, reviewId, grace, now });
  return db.prepare("SELECT * FROM individual_scores WHERE id = ?").get(id) as IndividualScoreRow;
}

export function getScoresForClass(classId: string): {
  teamScores: TeamScoreRow[];
  individualScores: IndividualScoreRow[];
} {
  const db = getDb();
  const teamScores = db
    .prepare(
      `SELECT ts.* FROM team_scores ts JOIN teams t ON ts.team_id = t.id WHERE t.class_id = ?`
    )
    .all(classId) as TeamScoreRow[];
  const individualScores = db
    .prepare(
      `SELECT ix.* FROM individual_scores ix
       JOIN students s ON ix.student_id = s.id
       JOIN teams t ON s.team_id = t.id
       WHERE t.class_id = ?`
    )
    .all(classId) as IndividualScoreRow[];
  return { teamScores, individualScores };
}

// ---- Question bank (editable) ----

export interface QuestionBankCriterion {
  id: string;
  reviewId: string;
  reviewLabel: string;
  category: Category;
  text: string;
  guidance: string | null;
  questions: QuestionVariant[];
}

export function getQuestionBank(): QuestionBankCriterion[] {
  const db = getDb();
  const criteria = db
    .prepare(
      `SELECT c.id, c.review_id, c.category, c.text, c.order_index, c.guidance, r.label as review_label, r.number as review_number
       FROM criteria c JOIN reviews r ON c.review_id = r.id
       ORDER BY r.number, c.order_index`
    )
    .all() as {
    id: string;
    review_id: string;
    category: Category;
    text: string;
    guidance: string | null;
    review_label: string;
  }[];
  const questions = db
    .prepare("SELECT * FROM questions ORDER BY criterion_id, order_index")
    .all() as { id: string; criterion_id: string; text: string; order_index: number }[];
  return criteria.map((c) => ({
    id: c.id,
    reviewId: c.review_id,
    reviewLabel: c.review_label,
    category: c.category,
    text: c.text,
    guidance: c.guidance,
    questions: questions
      .filter((q) => q.criterion_id === c.id)
      .map((q) => ({ id: q.id, criterionId: q.criterion_id, text: q.text, order: q.order_index })),
  }));
}

export function addQuestionVariant(criterionId: string, text: string): QuestionVariant {
  const db = getDb();
  const maxOrder =
    (db.prepare("SELECT MAX(order_index) as m FROM questions WHERE criterion_id = ?").get(criterionId) as {
      m: number | null;
    }).m ?? -1;
  const id = randomUUID();
  const order = maxOrder + 1;
  db.prepare("INSERT INTO questions (id, criterion_id, text, order_index) VALUES (?, ?, ?, ?)").run(
    id,
    criterionId,
    text,
    order
  );
  return { id, criterionId, text, order };
}

export function updateQuestionVariant(id: string, text: string): void {
  getDb().prepare("UPDATE questions SET text = ? WHERE id = ?").run(text, id);
}

export function deleteQuestionVariant(id: string): void {
  getDb().prepare("DELETE FROM questions WHERE id = ?").run(id);
}

export function updateCriterionGuidance(criterionId: string, guidance: string): void {
  getDb().prepare("UPDATE criteria SET guidance = ? WHERE id = ?").run(guidance, criterionId);
}

// ---- Question sessions (per-student generated Q&A set) + ratings ----

export function getTeammateUsedCriteria(teamId: string, reviewId: string, excludeStudentId: string): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT qs.criterion_ids FROM question_sessions qs
       JOIN students s ON qs.student_id = s.id
       WHERE s.team_id = ? AND qs.review_id = ? AND qs.student_id != ?`
    )
    .all(teamId, reviewId, excludeStudentId) as { criterion_ids: string }[];
  const used = new Set<string>();
  for (const row of rows) {
    for (const id of JSON.parse(row.criterion_ids) as string[]) used.add(id);
  }
  return used;
}

export function getQuestionSession(studentId: string, reviewId: string): QuestionSessionRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM question_sessions WHERE student_id = ? AND review_id = ?")
    .get(studentId, reviewId) as { id: string; student_id: string; review_id: string; criterion_ids: string; created_at: string } | undefined;
  if (!row) return null;
  return { ...row, criterion_ids: JSON.parse(row.criterion_ids) };
}

export function saveQuestionSession(
  studentId: string,
  reviewId: string,
  criterionIds: string[]
): QuestionSessionRow {
  const db = getDb();
  const id = `${studentId}:${reviewId}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO question_sessions (id, student_id, review_id, criterion_ids, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(student_id, review_id) DO UPDATE SET criterion_ids = excluded.criterion_ids, created_at = excluded.created_at`
  ).run(id, studentId, reviewId, JSON.stringify(criterionIds), now);
  return { id, student_id: studentId, review_id: reviewId, criterion_ids: criterionIds, created_at: now };
}

export function getQuestionRatings(studentId: string, reviewId: string): QuestionRatingRow[] {
  return getDb()
    .prepare("SELECT * FROM question_ratings WHERE student_id = ? AND review_id = ?")
    .all(studentId, reviewId) as QuestionRatingRow[];
}

const RATING_VALUE: Record<QuestionRating, number> = { answered: 2, middle: 0, unanswered: -2 };

/**
 * Ratings are optional per question - only the ones the reviewer actually
 * set count toward the average, which becomes that student's delta. Set
 * rating to null to clear one (excludes it from the average again).
 */
export function upsertQuestionRating(
  studentId: string,
  reviewId: string,
  criterionId: string,
  rating: QuestionRating | null
): { delta: number | null; ratings: QuestionRatingRow[] } {
  const db = getDb();
  const now = new Date().toISOString();
  if (rating === null) {
    db.prepare(
      "DELETE FROM question_ratings WHERE student_id = ? AND review_id = ? AND criterion_id = ?"
    ).run(studentId, reviewId, criterionId);
  } else {
    const id = `${studentId}:${reviewId}:${criterionId}`;
    db.prepare(
      `INSERT INTO question_ratings (id, student_id, review_id, criterion_id, rating, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, review_id, criterion_id) DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at`
    ).run(id, studentId, reviewId, criterionId, rating, now);
  }
  const ratings = getQuestionRatings(studentId, reviewId);
  let delta: number | null = null;
  if (ratings.length > 0) {
    const sum = ratings.reduce((acc, r) => acc + RATING_VALUE[r.rating], 0);
    delta = Math.round((sum / ratings.length) * 100) / 100;
  }
  const existingNotes =
    (
      db.prepare("SELECT notes FROM individual_scores WHERE student_id = ? AND review_id = ?").get(
        studentId,
        reviewId
      ) as { notes: string | null } | undefined
    )?.notes ?? null;
  upsertIndividualScore({ studentId, reviewId, delta, notes: existingNotes });
  return { delta, ratings };
}

// ---- Live review sessions (presentation timer -> individual Q&A -> final) ----

function freshReviewSession(teamId: string, reviewId: string): ReviewSessionRow {
  return {
    id: `${teamId}:${reviewId}`,
    team_id: teamId,
    review_id: reviewId,
    phase: "idle",
    timer_started_at: null,
    timer_duration_seconds: 1200,
    current_student_index: 0,
    updated_at: new Date().toISOString(),
  };
}

export function getReviewSession(teamId: string, reviewId: string): ReviewSessionRow {
  const db = getDb();
  const id = `${teamId}:${reviewId}`;
  const row = db.prepare("SELECT * FROM review_sessions WHERE id = ?").get(id) as ReviewSessionRow | undefined;
  if (row) return row;
  const fresh = freshReviewSession(teamId, reviewId);
  db.prepare(
    `INSERT INTO review_sessions (id, team_id, review_id, phase, timer_started_at, timer_duration_seconds, current_student_index, updated_at)
     VALUES (@id, @team_id, @review_id, @phase, @timer_started_at, @timer_duration_seconds, @current_student_index, @updated_at)`
  ).run(fresh);
  return fresh;
}

export function updateReviewSession(
  teamId: string,
  reviewId: string,
  patch: Partial<
    Pick<ReviewSessionRow, "phase" | "timer_started_at" | "timer_duration_seconds" | "current_student_index">
  >
): ReviewSessionRow {
  const db = getDb();
  const current = getReviewSession(teamId, reviewId);
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  db.prepare(
    `UPDATE review_sessions SET phase=@phase, timer_started_at=@timer_started_at,
       timer_duration_seconds=@timer_duration_seconds, current_student_index=@current_student_index,
       updated_at=@updated_at WHERE id=@id`
  ).run(next);
  return next;
}

// ---- Reset (scoring data only - never touches classes/teams/students/rubric) ----

/** Clears one team's scores, question sessions/ratings, and live-session
 * state so it can be graded again from scratch. Roster is untouched. */
export function resetTeamScoring(teamId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    const students = db.prepare("SELECT id FROM students WHERE team_id = ?").all(teamId) as { id: string }[];
    db.prepare("DELETE FROM team_scores WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM review_sessions WHERE team_id = ?").run(teamId);
    for (const s of students) {
      db.prepare("DELETE FROM individual_scores WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM question_ratings WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM question_sessions WHERE student_id = ?").run(s.id);
    }
  });
  tx();
}

/** Clears ALL scoring data across every class - classes, teams, students,
 * the rubric, and the question bank are all left exactly as they are. */
export function resetAllScoring(): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM team_scores").run();
    db.prepare("DELETE FROM individual_scores").run();
    db.prepare("DELETE FROM question_ratings").run();
    db.prepare("DELETE FROM question_sessions").run();
    db.prepare("DELETE FROM review_sessions").run();
  });
  tx();
}
