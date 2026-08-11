import { Router } from "express";
import { getDb } from "../db";

export const dbViewerRouter = Router();

const ROW_LIMIT = 500;

function realTableNames(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

dbViewerRouter.get("/tables", (_req, res) => {
  const db = getDb();
  const tables = realTableNames().map((name) => {
    const count = (db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get() as { c: number }).c;
    return { name, rowCount: count };
  });
  res.json(tables);
});

dbViewerRouter.get("/tables/:name", (req, res) => {
  const { name } = req.params;
  if (!realTableNames().includes(name)) {
    return res.status(404).json({ error: `No such table: ${name}` });
  }
  const db = getDb();
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const columns = (db.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[]).map((c) => c.name);
  const rows = db.prepare(`SELECT * FROM "${name}" LIMIT ? OFFSET ?`).all(ROW_LIMIT, offset);
  const total = (db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get() as { c: number }).c;
  res.json({ columns, rows, total, limit: ROW_LIMIT, offset });
});

/**
 * Read-only query console for Admins: only a single SELECT/WITH statement
 * is allowed (no semicolon-separated statements, no writes/PRAGMA/ATTACH),
 * so a bad query can't corrupt or wipe real data - the closest thing to a
 * safe raw-SQL box for a tool with no other auth model.
 */
dbViewerRouter.post("/query", (req, res) => {
  const sql = String(req.body?.sql ?? "").trim();
  if (!sql) {
    return res.status(400).json({ error: "sql is required" });
  }
  if (sql.includes(";") && sql.indexOf(";") !== sql.length - 1) {
    return res.status(400).json({ error: "Only a single statement is allowed" });
  }
  const withoutTrailingSemicolon = sql.endsWith(";") ? sql.slice(0, -1) : sql;
  if (!/^(select|with)\b/i.test(withoutTrailingSemicolon.trim())) {
    return res.status(400).json({ error: "Only SELECT (or WITH ... SELECT) queries are allowed" });
  }
  try {
    const db = getDb();
    const rows = db.prepare(withoutTrailingSemicolon).all() as Record<string, unknown>[];
    const truncated = rows.length > ROW_LIMIT;
    res.json({
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows: rows.slice(0, ROW_LIMIT),
      truncated,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "invalid query" });
  }
});
