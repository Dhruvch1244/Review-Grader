import { Router } from "express";
import {
  getQuestionBank,
  addQuestionVariant,
  updateQuestionVariant,
  deleteQuestionVariant,
  updateCriterionGuidance,
} from "../queries";

export const questionBankRouter = Router();

questionBankRouter.get("/", (_req, res) => {
  res.json(getQuestionBank());
});

questionBankRouter.post("/questions", (req, res) => {
  const body = req.body ?? {};
  if (!body.criterionId || !body.text) {
    return res.status(400).json({ error: "criterionId and text are required" });
  }
  const variant = addQuestionVariant(body.criterionId, body.text);
  res.status(201).json(variant);
});

questionBankRouter.patch("/questions/:id", (req, res) => {
  const body = req.body ?? {};
  if (typeof body.text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }
  updateQuestionVariant(req.params.id, body.text);
  res.json({ ok: true });
});

questionBankRouter.delete("/questions/:id", (req, res) => {
  deleteQuestionVariant(req.params.id);
  res.json({ ok: true });
});

questionBankRouter.patch("/guidance/:criterionId", (req, res) => {
  const body = req.body ?? {};
  if (typeof body.guidance !== "string") {
    return res.status(400).json({ error: "guidance is required" });
  }
  updateCriterionGuidance(req.params.criterionId, body.guidance);
  res.json({ ok: true });
});
