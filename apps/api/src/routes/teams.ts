import { Router } from "express";
import { deleteTeam, resetTeamScoring, addStudent } from "../queries";

export const teamsRouter = Router();

teamsRouter.delete("/:id", (req, res) => {
  deleteTeam(req.params.id);
  res.json({ ok: true });
});

teamsRouter.delete("/:id/reset", (req, res) => {
  resetTeamScoring(req.params.id);
  res.json({ ok: true });
});

teamsRouter.post("/:id/students", (req, res) => {
  const body = req.body ?? {};
  const student = addStudent(req.params.id, body.name);
  res.status(201).json(student);
});
