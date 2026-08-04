import { Router } from "express";
import * as XLSX from "xlsx";
import { buildClassWorkbook } from "../xlsx-export";
import { getClassData } from "../queries";

export const exportRouter = Router();

exportRouter.get("/", (req, res) => {
  const classId = req.query.classId as string | undefined;
  if (!classId) return res.status(400).json({ error: "classId is required" });
  const data = getClassData(classId);
  if (!data) return res.status(404).json({ error: "not found" });

  const wb = buildClassWorkbook(classId);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `review-grader-${data.class.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});
