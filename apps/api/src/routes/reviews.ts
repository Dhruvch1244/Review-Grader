import { Router } from "express";
import { listReviews, updateReviewSections } from "../queries";

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
