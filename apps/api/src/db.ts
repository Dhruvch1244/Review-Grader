import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import { randomUUID } from "crypto";
import { REVIEWS, REVIEW_SECTIONS } from "./trading-system-seed";
import { generateIndianNames } from "./indian-names";

const DEFAULT_CLASS_COUNT = 6;
const DEFAULT_TEAMS_PER_CLASS = 4;
const DEFAULT_TEAM_SIZE = 6;
const CLASS_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Same location the Next.js version used, so upgrading doesn't lose an
// existing installation's data: ~/.review-grader/review-grader.db, or
// REVIEW_GRADER_DATA_DIR to override.
const DATA_DIR = process.env.REVIEW_GRADER_DATA_DIR || path.join(os.homedir(), ".review-grader");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "review-grader.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reviewer_name TEXT,
  headcount INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  slot_index INTEGER NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  label TEXT NOT NULL,
  sprint_range TEXT NOT NULL
);

-- Replaces the old 1-5 rubric "criteria": a marks-based section of a review
-- (e.g. "Database Design and Modeling" - 10 marks), grouped technical or
-- non-technical. Admin-editable label/marks; not scored directly - see
-- subtopics below.
CREATE TABLE IF NOT EXISTS review_sections (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL, -- 'technical' | 'non_technical'
  max_marks REAL NOT NULL,
  order_index INTEGER NOT NULL
);

-- A reviewer-addable breakdown of a section (e.g. under "Database Design":
-- "Schema normalization", "Indexing strategy") - shared across the whole
-- review, not per-team, so every team is judged against the same rubric
-- once someone adds it.
CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES review_sections(id),
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- One reviewer's own 4-band rating of one subtopic FOR ONE TEAM (marks are
-- team-level, shared across all its members - the project is a team
-- deliverable). Averaged across whichever reviewers have rated a subtopic,
-- then averaged across a section's rated subtopics and scaled to the
-- section's max_marks (see computeSectionScores).
CREATE TABLE IF NOT EXISTS subtopic_scores (
  id TEXT PRIMARY KEY,
  subtopic_id TEXT NOT NULL REFERENCES subtopics(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  reviewer_id TEXT NOT NULL,
  band TEXT NOT NULL, -- 'below' | 'partial' | 'meets' | 'exceeds' (1-4)
  updated_at TEXT NOT NULL,
  UNIQUE(subtopic_id, team_id, reviewer_id)
);

-- Global reviewer roster (not per-class) - admin adds a name once and it's
-- usable across every class.
CREATE TABLE IF NOT EXISTS reviewers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- A reviewer opting in to score a specific class's specific review. One
-- reviewer can belong to multiple (class, review) pairs at once.
CREATE TABLE IF NOT EXISTS review_reviewers (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  review_id TEXT NOT NULL REFERENCES reviews(id),
  reviewer_id TEXT NOT NULL REFERENCES reviewers(id),
  UNIQUE(class_id, review_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS review_sessions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'idle',
  timer_started_at TEXT,
  timer_duration_seconds INTEGER NOT NULL DEFAULT 1200,
  updated_at TEXT NOT NULL,
  UNIQUE(team_id, review_id)
);
`;

function seedReviewSections(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }).c;
  if (count > 0) return;
  const insertReview = db.prepare(
    "INSERT INTO reviews (id, number, label, sprint_range) VALUES (?, ?, ?, ?)"
  );
  const insertSection = db.prepare(
    "INSERT INTO review_sections (id, review_id, key, label, category, max_marks, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const r of REVIEWS) insertReview.run(r.id, r.number, r.label, r.sprintRange);
    for (const s of REVIEW_SECTIONS) {
      insertSection.run(s.id, s.reviewId, s.key, s.label, s.category, s.maxMarks, s.order);
    }
  });
  tx();
}

function seedDefaultClasses(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM classes").get() as { c: number }).c;
  if (count > 0) return;

  const headcount = DEFAULT_TEAMS_PER_CLASS * DEFAULT_TEAM_SIZE;
  const allNames = generateIndianNames(DEFAULT_CLASS_COUNT * headcount);
  const insertClass = db.prepare(
    "INSERT INTO classes (id, name, reviewer_name, headcount, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTeam = db.prepare(
    "INSERT INTO teams (id, class_id, number, name) VALUES (?, ?, ?, ?)"
  );
  const insertStudent = db.prepare(
    "INSERT INTO students (id, team_id, slot_index, name) VALUES (?, ?, ?, ?)"
  );
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    let nameIdx = 0;
    for (let ci = 0; ci < DEFAULT_CLASS_COUNT; ci++) {
      const classId = randomUUID();
      insertClass.run(classId, `Class ${CLASS_LETTERS[ci]}`, null, headcount, now);
      for (let ti = 0; ti < DEFAULT_TEAMS_PER_CLASS; ti++) {
        const teamId = randomUUID();
        insertTeam.run(teamId, classId, ti + 1, `Team ${ti + 1}`);
        for (let si = 0; si < DEFAULT_TEAM_SIZE; si++) {
          insertStudent.run(randomUUID(), teamId, si + 1, allNames[nameIdx++]);
        }
      }
    }
  });
  tx();
}

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seedReviewSections(db);
  seedDefaultClasses(db);
  return db;
}

let dbInstance: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = createConnection();
  }
  return dbInstance;
}
