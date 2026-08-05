import { Router } from "express";
import { resetAllScoring } from "../queries";

export const resetAllRouter = Router();

resetAllRouter.delete("/", (_req, res) => {
  resetAllScoring();
  res.json({ ok: true });
});
