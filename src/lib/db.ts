import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { REVIEWS, CRITERIA } from "./rubric-seed";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "review-grader.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  instructor_name TEXT,
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

CREATE TABLE IF NOT EXISTS team_scores (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  score INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(team_id, review_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS individual_scores (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  delta INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, review_id)
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

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seedRubric(db);
  return db;
}

declare global {
  var __reviewGraderDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__reviewGraderDb) {
    global.__reviewGraderDb = createConnection();
  }
  return global.__reviewGraderDb;
}
