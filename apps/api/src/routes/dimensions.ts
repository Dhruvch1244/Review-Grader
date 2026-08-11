import { Router } from "express";
import { listDimensions, updateDimensionWeights } from "../queries";

export const dimensionsRouter = Router();

dimensionsRouter.get("/", (_req, res) => {
  res.json(listDimensions());
});

dimensionsRouter.put("/", (req, res) => {
  const weights = req.body?.weights as { id: string; weightPercent: number }[] | undefined;
  if (!Array.isArray(weights)) {
    return res.status(400).json({ error: "weights array is required" });
  }
  try {
    res.json(updateDimensionWeights(weights));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "invalid weights" });
  }
});
