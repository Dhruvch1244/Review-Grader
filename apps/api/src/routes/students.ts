import { Router } from "express";
import { renameStudent, deleteStudent, reassignStudentTeam } from "../queries";

export const studentsRouter = Router();

studentsRouter.patch("/:id", (req, res) => {
  const body = req.body ?? {};
  if (typeof body.name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  renameStudent(req.params.id, body.name);
  res.json({ ok: true });
});

studentsRouter.delete("/:id", (req, res) => {
  deleteStudent(req.params.id);
  res.json({ ok: true });
});

studentsRouter.patch("/:id/team", (req, res) => {
  const body = req.body ?? {};
  if (typeof body.teamId !== "string") {
    return res.status(400).json({ error: "teamId is required" });
  }
  reassignStudentTeam(req.params.id, body.teamId);
  res.json({ ok: true });
});
