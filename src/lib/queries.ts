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
} from "./types";

const DEFAULT_TEAM_SIZE = 6;

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

export function createClassWithTeams(input: {
  name: string;
  instructorName?: string;
  headcount: number;
  teamSize?: number;
}): ClassData {
  const db = getDb();
  const teamSize = input.teamSize && input.teamSize > 0 ? input.teamSize : DEFAULT_TEAM_SIZE;
  const classId = randomUUID();
  const now = new Date().toISOString();

  const insertClass = db.prepare(
    "INSERT INTO classes (id, name, instructor_name, headcount, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTeam = db.prepare(
    "INSERT INTO teams (id, class_id, number, name) VALUES (?, ?, ?, ?)"
  );
  const insertStudent = db.prepare(
    "INSERT INTO students (id, team_id, slot_index, name) VALUES (?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    insertClass.run(classId, input.name, input.instructorName ?? null, input.headcount, now);
    const teamCount = Math.max(1, Math.ceil(input.headcount / teamSize));
    let remaining = input.headcount;
    for (let i = 0; i < teamCount; i++) {
      const teamId = randomUUID();
      insertTeam.run(teamId, classId, i + 1, `Team ${i + 1}`);
      const slotsInTeam = Math.min(teamSize, remaining) || teamSize;
      for (let s = 0; s < slotsInTeam; s++) {
        insertStudent.run(randomUUID(), teamId, s + 1, `Student ${i + 1}.${s + 1}`);
      }
      remaining -= slotsInTeam;
    }
  });
  tx();

  return getClassData(classId)!;
}

export function renameStudent(studentId: string, name: string): void {
  getDb().prepare("UPDATE students SET name = ? WHERE id = ?").run(name, studentId);
}

export function bulkAutofillTeamStudents(teamId: string, names: string[]): TeamWithStudents {
  const db = getDb();
  const students = db
    .prepare("SELECT * FROM students WHERE team_id = ? ORDER BY slot_index")
    .all(teamId) as StudentRow[];
  const update = db.prepare("UPDATE students SET name = ? WHERE id = ?");
  const tx = db.transaction(() => {
    students.forEach((s, idx) => {
      if (names[idx]) update.run(names[idx].trim(), s.id);
    });
  });
  tx();
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId) as TeamRow;
  const refreshed = db
    .prepare("SELECT * FROM students WHERE team_id = ? ORDER BY slot_index")
    .all(teamId) as StudentRow[];
  return { ...team, students: refreshed };
}

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
    category: "Build" | "Security";
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
      .map((c) => ({ id: c.id, reviewId: c.review_id, category: c.category, text: c.text, order: c.order_index })),
  }));
}

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
