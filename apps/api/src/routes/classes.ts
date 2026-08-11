import { Router } from "express";
import {
  listClasses,
  getClassData,
  bulkAutofillClass,
  addTeam,
  addClassReviewer,
  renameClassReviewer,
  deleteClassReviewer,
} from "../queries";
import { getDb } from "../db";

export const classesRouter = Router();

// Classes are fixed at 6 and auto-seeded on first run (see db.ts) - there
// is no create endpoint; only listing and per-class renames and roster
// management are supported.
classesRouter.get("/", (_req, res) => {
  res.json(listClasses());
});

classesRouter.get("/:id", (req, res) => {
  const data = getClassData(req.params.id);
  if (!data) return res.status(404).json({ error: "not found" });
  res.json(data);
});

classesRouter.patch("/:id", (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const db = getDb();
  if (body.reviewerName !== undefined) {
    db.prepare("UPDATE classes SET reviewer_name = ? WHERE id = ?").run(body.reviewerName, id);
  }
  if (body.name !== undefined) {
    db.prepare("UPDATE classes SET name = ? WHERE id = ?").run(body.name, id);
  }
  const data = getClassData(id);
  if (!data) return res.status(404).json({ error: "not found" });
  res.json(data);
});

classesRouter.post("/:id/teams", (req, res) => {
  const team = addTeam(req.params.id);
  res.status(201).json(team);
});

classesRouter.patch("/:id/autofill", (req, res) => {
  const body = req.body ?? {};
  const names: string[] = Array.isArray(body.names) ? body.names : [];
  const { classData, applied, totalSlots } = bulkAutofillClass(req.params.id, names);
  res.json({ ...classData, applied, totalSlots });
});

// ---- Class reviewers (2-3 per panel, typical) ----

classesRouter.post("/:id/reviewers", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  res.status(201).json(addClassReviewer(req.params.id, name));
});

classesRouter.patch("/reviewers/:reviewerId", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  renameClassReviewer(req.params.reviewerId, name);
  res.json({ ok: true });
});

classesRouter.delete("/reviewers/:reviewerId", (req, res) => {
  deleteClassReviewer(req.params.reviewerId);
  res.json({ ok: true });
});
