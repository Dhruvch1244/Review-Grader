import { Router } from "express";
import { listReviewers, addReviewer, renameReviewer, deleteReviewer } from "../queries";

// Global reviewer roster (not per-class) - a reviewer identity used across
// every class, then self-selected into specific (class, review) pairs via
// /api/review-reviewers.
export const reviewersRouter = Router();

reviewersRouter.get("/", (_req, res) => {
  res.json(listReviewers());
});

reviewersRouter.post("/", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  res.status(201).json(addReviewer(name));
});

reviewersRouter.patch("/:id", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  renameReviewer(req.params.id, name);
  res.json({ ok: true });
});

reviewersRouter.delete("/:id", (req, res) => {
  deleteReviewer(req.params.id);
  res.json({ ok: true });
});
