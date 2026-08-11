import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import { randomUUID } from "crypto";
import { REVIEWS, CRITERIA } from "./rubric-seed";
import { DEFAULT_DIMENSIONS } from "./dimensions-seed";
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

CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS class_reviewers (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- A panel typically has 2-3 reviewers scoring the same team/student
-- independently - each reviewer's score is its own row here, and the
-- team's displayed baseline is the average across whichever reviewers
-- have scored a given criterion (see getTeamScoresByCriterion).
CREATE TABLE IF NOT EXISTS team_scores (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  score INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(team_id, review_id, criterion_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS individual_scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  delta REAL,
  notes TEXT,
  grace REAL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, review_id)
);

CREATE TABLE IF NOT EXISTS dimensions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  weight_percent REAL NOT NULL,
  order_index INTEGER NOT NULL
);

-- Same per-reviewer shape as team_scores - each reviewer grades a
-- dimension independently, averaged across reviewers per dimension, then
-- weight-averaged across dimensions (see upsertDimensionScore).
CREATE TABLE IF NOT EXISTS dimension_scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, review_id, dimension_id, reviewer_id)
);

-- Not averaged like scores above - each question is attributed to
-- whichever reviewer logged it (reviewer_id), so the panel can see who
-- asked what while multiple reviewers add to the same shared list.
CREATE TABLE IF NOT EXISTS asked_questions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  reviewer_id TEXT,
  text TEXT NOT NULL,
  rating TEXT,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_sessions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'idle',
  timer_started_at TEXT,
  timer_duration_seconds INTEGER NOT NULL DEFAULT 1200,
  current_student_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(team_id, review_id)
);
`;

function seedRubric(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }).c;
  if (count > 0) return;
  const insertReview = db.prepare(
    "INSERT INTO reviews (id, number, label, sprint_range) VALUES (?, ?, ?, ?)"
  );
  const insertCriterion = db.prepare(
    "INSERT INTO criteria (id, review_id, category, text, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const r of REVIEWS) insertReview.run(r.id, r.number, r.label, r.sprintRange);
    for (const c of CRITERIA) insertCriterion.run(c.id, c.reviewId, c.category, c.text, c.order);
  });
  tx();
}

function seedDimensions(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM dimensions").get() as { c: number }).c;
  if (count > 0) return;
  const insertDimension = db.prepare(
    "INSERT INTO dimensions (id, key, label, weight_percent, order_index) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const d of DEFAULT_DIMENSIONS) {
      insertDimension.run(randomUUID(), d.key, d.label, d.weightPercent, d.order);
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
  seedRubric(db);
  seedDimensions(db);
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
