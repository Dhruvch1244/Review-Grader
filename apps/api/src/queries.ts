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
  DimensionDef,
  DimensionScoreRow,
  AskedQuestionRow,
  GradeBand,
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
      db.prepare("DELETE FROM dimension_scores WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM asked_questions WHERE student_id = ?").run(s.id);
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
    db.prepare("DELETE FROM dimension_scores WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM asked_questions WHERE student_id = ?").run(studentId);
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

// ---- Dimensions (editable weights) + per-student dimension scores ----

export function listDimensions(): DimensionDef[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM dimensions ORDER BY order_index").all() as {
    id: string;
    key: string;
    label: string;
    weight_percent: number;
    order_index: number;
  }[];
  return rows.map((r) => ({ id: r.id, key: r.key, label: r.label, weightPercent: r.weight_percent, order: r.order_index }));
}

/** Throws if the new weights don't sum to ~100 (within floating-point slop). */
export function updateDimensionWeights(weights: { id: string; weightPercent: number }[]): DimensionDef[] {
  const total = weights.reduce((sum, w) => sum + w.weightPercent, 0);
  if (Math.abs(total - 100) > 0.5) {
    throw new Error(`Dimension weights must sum to 100 (got ${total})`);
  }
  const db = getDb();
  const update = db.prepare("UPDATE dimensions SET weight_percent = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const w of weights) update.run(w.weightPercent, w.id);
  });
  tx();
  return listDimensions();
}

export function getDimensionScores(studentId: string, reviewId: string): DimensionScoreRow[] {
  return getDb()
    .prepare("SELECT * FROM dimension_scores WHERE student_id = ? AND review_id = ?")
    .all(studentId, reviewId) as DimensionScoreRow[];
}

/**
 * Dimensions are graded independently and don't all need a score at once -
 * the delta is the weighted average of whatever's been graded so far, with
 * those dimensions' weights re-normalized to sum to 100% among themselves,
 * centered on 3 ("meets") so it nudges the team baseline up or down the
 * same way the old question-rating delta did. Set score to null to clear a
 * dimension's grade (excludes it from the average again).
 */
export function upsertDimensionScore(
  studentId: string,
  reviewId: string,
  dimensionId: string,
  score: number | null
): { delta: number | null; scores: DimensionScoreRow[] } {
  const db = getDb();
  const now = new Date().toISOString();
  if (score === null) {
    db.prepare(
      "DELETE FROM dimension_scores WHERE student_id = ? AND review_id = ? AND dimension_id = ?"
    ).run(studentId, reviewId, dimensionId);
  } else {
    const id = `${studentId}:${reviewId}:${dimensionId}`;
    db.prepare(
      `INSERT INTO dimension_scores (id, student_id, review_id, dimension_id, score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, review_id, dimension_id) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`
    ).run(id, studentId, reviewId, dimensionId, score, now);
  }
  const scores = getDimensionScores(studentId, reviewId);
  let delta: number | null = null;
  if (scores.length > 0) {
    const dimensions = listDimensions();
    const scoredIds = new Set(scores.map((s) => s.dimension_id));
    const relevant = dimensions.filter((d) => scoredIds.has(d.id));
    const totalWeight = relevant.reduce((sum, d) => sum + d.weightPercent, 0) || 1;
    const weightedAvg = relevant.reduce((sum, d) => {
      const s = scores.find((sc) => sc.dimension_id === d.id)!;
      return sum + (d.weightPercent / totalWeight) * s.score;
    }, 0);
    delta = Math.round((weightedAvg - 3) * 100) / 100;
  }
  const existingNotes =
    (
      db.prepare("SELECT notes FROM individual_scores WHERE student_id = ? AND review_id = ?").get(
        studentId,
        reviewId
      ) as { notes: string | null } | undefined
    )?.notes ?? null;
  upsertIndividualScore({ studentId, reviewId, delta, notes: existingNotes });
  return { delta, scores };
}

// ---- Asked questions (free-form log of what was actually asked) ----

export function getAskedQuestions(studentId: string, reviewId: string): AskedQuestionRow[] {
  return getDb()
    .prepare("SELECT * FROM asked_questions WHERE student_id = ? AND review_id = ? ORDER BY order_index")
    .all(studentId, reviewId) as AskedQuestionRow[];
}

export function addAskedQuestion(studentId: string, reviewId: string, text: string): AskedQuestionRow {
  const db = getDb();
  const maxOrder =
    (
      db
        .prepare("SELECT MAX(order_index) as m FROM asked_questions WHERE student_id = ? AND review_id = ?")
        .get(studentId, reviewId) as { m: number | null }
    ).m ?? -1;
  const id = randomUUID();
  const now = new Date().toISOString();
  const order = maxOrder + 1;
  db.prepare(
    `INSERT INTO asked_questions (id, student_id, review_id, text, rating, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`
  ).run(id, studentId, reviewId, text, order, now, now);
  return { id, student_id: studentId, review_id: reviewId, text, rating: null, order_index: order, created_at: now, updated_at: now };
}

export function updateAskedQuestion(id: string, patch: { text?: string; rating?: GradeBand | null }): AskedQuestionRow {
  const db = getDb();
  const now = new Date().toISOString();
  if (patch.text !== undefined) {
    db.prepare("UPDATE asked_questions SET text = ?, updated_at = ? WHERE id = ?").run(patch.text, now, id);
  }
  if (patch.rating !== undefined) {
    db.prepare("UPDATE asked_questions SET rating = ?, updated_at = ? WHERE id = ?").run(patch.rating, now, id);
  }
  return db.prepare("SELECT * FROM asked_questions WHERE id = ?").get(id) as AskedQuestionRow;
}

export function deleteAskedQuestion(id: string): void {
  getDb().prepare("DELETE FROM asked_questions WHERE id = ?").run(id);
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

/** Clears one team's scores, dimension scores/asked questions, and
 * live-session state so it can be graded again from scratch. Roster is
 * untouched. */
export function resetTeamScoring(teamId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    const students = db.prepare("SELECT id FROM students WHERE team_id = ?").all(teamId) as { id: string }[];
    db.prepare("DELETE FROM team_scores WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM review_sessions WHERE team_id = ?").run(teamId);
    for (const s of students) {
      db.prepare("DELETE FROM individual_scores WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM dimension_scores WHERE student_id = ?").run(s.id);
      db.prepare("DELETE FROM asked_questions WHERE student_id = ?").run(s.id);
    }
  });
  tx();
}

/** Clears ALL scoring data across every class - classes, teams, students,
 * the rubric, and the dimension weights are all left exactly as they are. */
export function resetAllScoring(): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM team_scores").run();
    db.prepare("DELETE FROM individual_scores").run();
    db.prepare("DELETE FROM dimension_scores").run();
    db.prepare("DELETE FROM asked_questions").run();
    db.prepare("DELETE FROM review_sessions").run();
  });
  tx();
}
