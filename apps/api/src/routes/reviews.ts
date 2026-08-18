import { Router } from "express";
import { listReviews, updateReviewSections, addReviewSection, deleteReviewSection } from "../queries";

export const reviewsRouter = Router();

reviewsRouter.get("/", (_req, res) => {
  res.json(listReviews());
});

/** Admin edit: bulk-update section labels/marks. Body: { sections: [{id,
 * label, maxMarks}] }. */
reviewsRouter.put("/sections", (req, res) => {
  const sections = req.body?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: "sections array is required" });
  }
  for (const s of sections) {
    if (!s.id || typeof s.label !== "string" || typeof s.maxMarks !== "number") {
      return res.status(400).json({ error: "each section needs id, label, maxMarks" });
    }
  }
  updateReviewSections(sections);
  res.json(listReviews());
});

/** Admin adds a new section to a review. Body: { reviewId, label,
 * category, maxMarks }. */
reviewsRouter.post("/sections", (req, res) => {
  const body = req.body ?? {};
  const label = String(body.label ?? "").trim();
  if (!body.reviewId || !label || !["technical", "non_technical"].includes(body.category) || typeof body.maxMarks !== "number") {
    return res.status(400).json({ error: "reviewId, label, category ('technical'|'non_technical'), maxMarks are required" });
  }
  addReviewSection(body.reviewId, label, body.category, body.maxMarks);
  res.status(201).json(listReviews());
});

reviewsRouter.delete("/sections/:id", (req, res) => {
  deleteReviewSection(req.params.id);
  res.json(listReviews());
});
