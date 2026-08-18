import { Router } from "express";
import { getWeakTopics } from "../queries";

export const weakTopicsRouter = Router();

weakTopicsRouter.get("/", (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  if (!teamId) return res.status(400).json({ error: "teamId is required" });
  res.json(getWeakTopics(teamId));
});
