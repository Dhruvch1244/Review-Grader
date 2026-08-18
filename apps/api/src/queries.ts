import { randomUUID } from "crypto";
import { getDb } from "./db";
import { GRADE_BAND_VALUE } from "./types";
import type {
  ClassRow,
  TeamRow,
  StudentRow,
  ClassData,
  TeamWithStudents,
  ReviewDef,
  ReviewSectionDef,
  SectionCategory,
  SubtopicDef,
  SubtopicScoreRow,
  ReviewerRow,
  ReviewReviewerRow,
  SectionScoreRow,
  ReviewTotalRow,
  WeakTopicRow,
  GradeBand,
  ReviewSessionRow,
} from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
    db.prepare("DELETE FROM students WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM subtopic_scores WHERE team_id = ?").run(teamId);
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
  getDb().prepare("DELETE FROM students WHERE id = ?").run(studentId);
}

// ---- Global reviewer roster ----

export function listReviewers(): ReviewerRow[] {
  return getDb().prepare("SELECT * FROM reviewers ORDER BY order_index").all() as ReviewerRow[];
}

export function addReviewer(name: string): ReviewerRow {
  const db = getDb();
  const maxOrder =
    (db.prepare("SELECT MAX(order_index) as m FROM reviewers").get() as { m: number | null }).m ?? -1;
  const id = randomUUID();
  const order_index = maxOrder + 1;
  db.prepare("INSERT INTO reviewers (id, name, order_index) VALUES (?, ?, ?)").run(id, name, order_index);
  return { id, name, order_index };
}

export function renameReviewer(id: string, name: string): void {
  getDb().prepare("UPDATE reviewers SET name = ? WHERE id = ?").run(name, id);
}

export function deleteReviewer(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM subtopic_scores WHERE reviewer_id = ?").run(id);
    db.prepare("DELETE FROM review_reviewers WHERE reviewer_id = ?").run(id);
    db.prepare("DELETE FROM reviewers WHERE id = ?").run(id);
  });
  tx();
}

// ---- Per-(class, review) reviewer self-selection ----

export function listReviewReviewers(classId: string): ReviewReviewerRow[] {
  return getDb()
    .prepare("SELECT * FROM review_reviewers WHERE class_id = ?")
    .all(classId) as ReviewReviewerRow[];
}

export function setReviewReviewerMembership(
  classId: string,
  reviewId: string,
  reviewerId: string,
  member: boolean
): void {
  const db = getDb();
  if (member) {
    db.prepare(
      "INSERT OR IGNORE INTO review_reviewers (id, class_id, review_id, reviewer_id) VALUES (?, ?, ?, ?)"
    ).run(randomUUID(), classId, reviewId, reviewerId);
  } else {
    db.prepare("DELETE FROM review_reviewers WHERE class_id = ? AND review_id = ? AND reviewer_id = ?").run(
      classId,
      reviewId,
      reviewerId
    );
  }
}

// ---- Reviews / sections / subtopics ----

type SectionWithSubtopics = ReviewSectionDef & { subtopics: SubtopicDef[] };

function getSectionsForReview(reviewId: string): SectionWithSubtopics[] {
  const db = getDb();
  const sections = db
    .prepare("SELECT * FROM review_sections WHERE review_id = ? ORDER BY order_index")
    .all(reviewId) as {
    id: string;
    review_id: string;
    key: string;
    label: string;
    category: SectionCategory;
    max_marks: number;
    order_index: number;
  }[];
  const subtopics = db
    .prepare(
      `SELECT sub.* FROM subtopics sub JOIN review_sections rs ON sub.section_id = rs.id
       WHERE rs.review_id = ? ORDER BY sub.order_index`
    )
    .all(reviewId) as {
    id: string;
    section_id: string;
    label: string;
    order_index: number;
    created_at: string;
  }[];
  return sections.map((s) => ({
    id: s.id,
    reviewId: s.review_id,
    key: s.key,
    label: s.label,
    category: s.category,
    maxMarks: s.max_marks,
    order: s.order_index,
    subtopics: subtopics
      .filter((sub) => sub.section_id === s.id)
      .map((sub) => ({
        id: sub.id,
        sectionId: sub.section_id,
        label: sub.label,
        order: sub.order_index,
        createdAt: sub.created_at,
      })),
  }));
}

export function listReviews(): (ReviewDef & { sections: SectionWithSubtopics[] })[] {
  const db = getDb();
  const reviews = db.prepare("SELECT * FROM reviews ORDER BY number").all() as {
    id: string;
    number: number;
    label: string;
    sprint_range: string;
  }[];
  return reviews.map((r) => ({
    id: r.id,
    number: r.number,
    label: r.label,
    sprintRange: r.sprint_range,
    sections: getSectionsForReview(r.id),
  }));
}

/** Admin edit: only label/marks are editable (category, review, and order
 * are fixed by the seed structure). */
export function updateReviewSections(patch: { id: string; label: string; maxMarks: number }[]): void {
  const db = getDb();
  const update = db.prepare("UPDATE review_sections SET label = ?, max_marks = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const p of patch) update.run(p.label, p.maxMarks, p.id);
  });
  tx();
}

export function addSubtopic(sectionId: string, label: string): SubtopicDef {
  const db = getDb();
  const maxOrder =
    (db.prepare("SELECT MAX(order_index) as m FROM subtopics WHERE section_id = ?").get(sectionId) as {
      m: number | null;
    }).m ?? -1;
  const id = randomUUID();
  const now = new Date().toISOString();
  const order_index = maxOrder + 1;
  db.prepare(
    "INSERT INTO subtopics (id, section_id, label, order_index, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, sectionId, label, order_index, now);
  return { id, sectionId, label, order: order_index, createdAt: now };
}

export function renameSubtopic(id: string, label: string): void {
  getDb().prepare("UPDATE subtopics SET label = ? WHERE id = ?").run(label, id);
}

export function deleteSubtopic(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM subtopic_scores WHERE subtopic_id = ?").run(id);
    db.prepare("DELETE FROM subtopics WHERE id = ?").run(id);
  });
  tx();
}

// ---- Subtopic scoring (team-level, per-reviewer, averaged) ----

/** Raw per-reviewer subtopic ratings for one team+review - used for
 * own-entry highlighting and to compute section scores. */
export function getSubtopicScoreEntries(teamId: string, reviewId: string): SubtopicScoreRow[] {
  return getDb()
    .prepare(
      `SELECT ss.* FROM subtopic_scores ss
       JOIN subtopics sub ON ss.subtopic_id = sub.id
       JOIN review_sections rs ON sub.section_id = rs.id
       WHERE ss.team_id = ? AND rs.review_id = ?`
    )
    .all(teamId, reviewId) as SubtopicScoreRow[];
}

/** Every section's computed score for one team+review: average band across
 * whichever subtopics have at least one rating (averaged across reviewers
 * first), then scaled to the section's max_marks. `score` stays null until
 * at least one subtopic under that section has a rating. */
export function computeSectionScores(teamId: string, reviewId: string): SectionScoreRow[] {
  const sections = getSectionsForReview(reviewId);
  const entries = getSubtopicScoreEntries(teamId, reviewId);
  return sections.map((section) => {
    const subtopicIds = new Set(section.subtopics.map((s) => s.id));
    const avgBySubtopic = new Map<string, number>();
    for (const subId of subtopicIds) {
      const subEntries = entries.filter((e) => e.subtopic_id === subId);
      if (subEntries.length > 0) {
        avgBySubtopic.set(
          subId,
          subEntries.reduce((sum, e) => sum + GRADE_BAND_VALUE[e.band], 0) / subEntries.length
        );
      }
    }
    const ratedSubtopics = avgBySubtopic.size;
    let score: number | null = null;
    if (ratedSubtopics > 0) {
      const avgOfAvgs = Array.from(avgBySubtopic.values()).reduce((a, b) => a + b, 0) / ratedSubtopics;
      score = round2(section.maxMarks * (avgOfAvgs / 4));
    }
    return {
      sectionId: section.id,
      teamId,
      reviewId,
      score,
      maxMarks: section.maxMarks,
      ratedSubtopics,
      totalSubtopics: subtopicIds.size,
    } satisfies SectionScoreRow;
  });
}

/** A team's rolled-up technical/non-technical/grand totals for one review -
 * only sections with at least one rated subtopic count toward "possible",
 * so an unstarted review reads as 0/0 rather than 0/100. */
export function computeReviewTotal(teamId: string, reviewId: string): ReviewTotalRow {
  const sections = getSectionsForReview(reviewId);
  const sectionScores = computeSectionScores(teamId, reviewId);
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  let technicalEarned = 0;
  let technicalMax = 0;
  let nonTechnicalEarned = 0;
  let nonTechnicalMax = 0;
  for (const ss of sectionScores) {
    if (ss.score === null) continue;
    const section = sectionById.get(ss.sectionId)!;
    if (section.category === "technical") {
      technicalEarned += ss.score;
      technicalMax += ss.maxMarks;
    } else {
      nonTechnicalEarned += ss.score;
      nonTechnicalMax += ss.maxMarks;
    }
  }
  return {
    teamId,
    reviewId,
    technicalEarned: round2(technicalEarned),
    technicalMax: round2(technicalMax),
    nonTechnicalEarned: round2(nonTechnicalEarned),
    nonTechnicalMax: round2(nonTechnicalMax),
    totalEarned: round2(technicalEarned + nonTechnicalEarned),
    totalMax: round2(technicalMax + nonTechnicalMax),
  };
}

/** Upserts ONE reviewer's own 4-band rating of one subtopic for one team.
 * Set band to null to clear this reviewer's rating. Returns the raw entries
 * plus the recomputed score for the subtopic's section, so the UI can
 * update optimistically without a full refetch. */
export function upsertSubtopicScore(
  subtopicId: string,
  teamId: string,
  reviewerId: string,
  band: GradeBand | null
): { entries: SubtopicScoreRow[]; sectionScore: SectionScoreRow } {
  const db = getDb();
  const now = new Date().toISOString();
  if (band === null) {
    db.prepare("DELETE FROM subtopic_scores WHERE subtopic_id = ? AND team_id = ? AND reviewer_id = ?").run(
      subtopicId,
      teamId,
      reviewerId
    );
  } else {
    const id = `${subtopicId}:${teamId}:${reviewerId}`;
    db.prepare(
      `INSERT INTO subtopic_scores (id, subtopic_id, team_id, reviewer_id, band, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(subtopic_id, team_id, reviewer_id) DO UPDATE SET band = excluded.band, updated_at = excluded.updated_at`
    ).run(id, subtopicId, teamId, reviewerId, band, now);
  }
  const subtopic = db.prepare("SELECT section_id FROM subtopics WHERE id = ?").get(subtopicId) as
    | { section_id: string }
    | undefined;
  const section = subtopic
    ? (db.prepare("SELECT review_id FROM review_sections WHERE id = ?").get(subtopic.section_id) as
        | { review_id: string }
        | undefined)
    : undefined;
  const reviewId = section?.review_id ?? "";
  const entries = getSubtopicScoreEntries(teamId, reviewId);
  const sectionScore = computeSectionScores(teamId, reviewId).find((s) => s.sectionId === subtopic?.section_id)!;
  return { entries, sectionScore };
}

/** Class-wide computed section scores + review totals for every team - the
 * shape Score/Review/Stats/Export all consume. */
export function getScoresForClass(classId: string): {
  sectionScores: SectionScoreRow[];
  reviewTotals: ReviewTotalRow[];
} {
  const db = getDb();
  const teams = db.prepare("SELECT id FROM teams WHERE class_id = ?").all(classId) as { id: string }[];
  const reviews = db.prepare("SELECT id FROM reviews ORDER BY number").all() as { id: string }[];
  const sectionScores: SectionScoreRow[] = [];
  const reviewTotals: ReviewTotalRow[] = [];
  for (const team of teams) {
    for (const review of reviews) {
      sectionScores.push(...computeSectionScores(team.id, review.id));
      reviewTotals.push(computeReviewTotal(team.id, review.id));
    }
  }
  return { sectionScores, reviewTotals };
}

// ---- Weak topics (replaces the old per-student Q&A log) ----

/** A team's weakest-rated subtopics across every review scored so far -
 * anything averaging below "Meets" (band 3), worst first. Empty once the
 * team has no below-par ratings. */
export function getWeakTopics(teamId: string, limit = 8): WeakTopicRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT sub.id as subtopicId, sub.label as subtopicLabel, rs.id as sectionId, rs.label as sectionLabel,
              rv.id as reviewId, rv.label as reviewLabel, ss.band
       FROM subtopic_scores ss
       JOIN subtopics sub ON ss.subtopic_id = sub.id
       JOIN review_sections rs ON sub.section_id = rs.id
       JOIN reviews rv ON rs.review_id = rv.id
       WHERE ss.team_id = ?`
    )
    .all(teamId) as {
    subtopicId: string;
    subtopicLabel: string;
    sectionId: string;
    sectionLabel: string;
    reviewId: string;
    reviewLabel: string;
    band: GradeBand;
  }[];

  const bySubtopic = new Map<string, { meta: (typeof rows)[number]; bands: GradeBand[] }>();
  for (const r of rows) {
    if (!bySubtopic.has(r.subtopicId)) bySubtopic.set(r.subtopicId, { meta: r, bands: [] });
    bySubtopic.get(r.subtopicId)!.bands.push(r.band);
  }

  const weak: WeakTopicRow[] = Array.from(bySubtopic.values())
    .map(({ meta, bands }) => ({
      subtopicId: meta.subtopicId,
      subtopicLabel: meta.subtopicLabel,
      sectionId: meta.sectionId,
      sectionLabel: meta.sectionLabel,
      reviewId: meta.reviewId,
      reviewLabel: meta.reviewLabel,
      teamId,
      avgBand: round2(bands.reduce((sum, b) => sum + GRADE_BAND_VALUE[b], 0) / bands.length),
      ratingCount: bands.length,
    }))
    .filter((w) => w.avgBand < 3)
    .sort((a, b) => a.avgBand - b.avgBand);

  return weak.slice(0, limit);
}

// ---- Live review sessions (presentation timer -> team scoring -> done) ----

function freshReviewSession(teamId: string, reviewId: string): ReviewSessionRow {
  return {
    id: `${teamId}:${reviewId}`,
    team_id: teamId,
    review_id: reviewId,
    phase: "idle",
    timer_started_at: null,
    timer_duration_seconds: 1200,
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
    `INSERT INTO review_sessions (id, team_id, review_id, phase, timer_started_at, timer_duration_seconds, updated_at)
     VALUES (@id, @team_id, @review_id, @phase, @timer_started_at, @timer_duration_seconds, @updated_at)`
  ).run(fresh);
  return fresh;
}

export function updateReviewSession(
  teamId: string,
  reviewId: string,
  patch: Partial<Pick<ReviewSessionRow, "phase" | "timer_started_at" | "timer_duration_seconds">>
): ReviewSessionRow {
  const db = getDb();
  const current = getReviewSession(teamId, reviewId);
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  db.prepare(
    `UPDATE review_sessions SET phase=@phase, timer_started_at=@timer_started_at,
       timer_duration_seconds=@timer_duration_seconds, updated_at=@updated_at WHERE id=@id`
  ).run(next);
  return next;
}

// ---- Reset (scoring data only - never touches classes/teams/students/rubric) ----

/** Clears one team's subtopic ratings and live-session state so it can be
 * graded again from scratch. Roster is untouched. */
export function resetTeamScoring(teamId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM subtopic_scores WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM review_sessions WHERE team_id = ?").run(teamId);
  });
  tx();
}

/** Clears ALL scoring data across every class - classes, teams, students,
 * the review/section/subtopic structure, and the reviewer roster are all
 * left exactly as they are. */
export function resetAllScoring(): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM subtopic_scores").run();
    db.prepare("DELETE FROM review_sessions").run();
  });
  tx();
}
