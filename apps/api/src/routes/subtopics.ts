import { Router } from "express";
import { addSubtopic, renameSubtopic, deleteSubtopic } from "../queries";

// Reviewer-addable breakdown of a section (e.g. "Schema normalization"
// under "Database Design") - shared across the whole review, not per-team.
export const subtopicsRouter = Router();

subtopicsRouter.post("/", (req, res) => {
  const sectionId = String(req.body?.sectionId ?? "").trim();
  const label = String(req.body?.label ?? "").trim();
  if (!sectionId || !label) return res.status(400).json({ error: "sectionId and label are required" });
  res.status(201).json(addSubtopic(sectionId, label));
});

subtopicsRouter.patch("/:id", (req, res) => {
  const label = String(req.body?.label ?? "").trim();
  if (!label) return res.status(400).json({ error: "label is required" });
  renameSubtopic(req.params.id, label);
  res.json({ ok: true });
});

subtopicsRouter.delete("/:id", (req, res) => {
  deleteSubtopic(req.params.id);
  res.json({ ok: true });
});
