"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { buildSummaryRows, overallByStudent } from "@/lib/rollup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  RosterExportRow,
  TeamScoreExportRow,
  IndividualScoreExportRow,
} from "@/lib/types";

export default function MergePage() {
  const [roster, setRoster] = useState<RosterExportRow[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScoreExportRow[]>([]);
  const [individualScores, setIndividualScores] = useState<IndividualScoreExportRow[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const newRoster: RosterExportRow[] = [];
    const newTeamScores: TeamScoreExportRow[] = [];
    const newIndividualScores: IndividualScoreExportRow[] = [];
    const names: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        if (wb.Sheets["Roster"]) {
          newRoster.push(...(XLSX.utils.sheet_to_json(wb.Sheets["Roster"]) as RosterExportRow[]));
        }
        if (wb.Sheets["TeamScores"]) {
          newTeamScores.push(
            ...(XLSX.utils.sheet_to_json(wb.Sheets["TeamScores"]) as TeamScoreExportRow[])
          );
        }
        if (wb.Sheets["IndividualScores"]) {
          newIndividualScores.push(
            ...(XLSX.utils.sheet_to_json(wb.Sheets["IndividualScores"]) as IndividualScoreExportRow[])
          );
        }
        names.push(file.name);
      } catch {
        setError(`Couldn't read "${file.name}" - is it an export from this app?`);
      }
    }

    setRoster((prev) => [...prev, ...newRoster]);
    setTeamScores((prev) => [...prev, ...newTeamScores]);
    setIndividualScores((prev) => [...prev, ...newIndividualScores]);
    setFileNames((prev) => [...prev, ...names]);
  }

  const summary = buildSummaryRows(teamScores, individualScores);
  const overall = overallByStudent(summary).sort((a, b) => {
    if (a.Class !== b.Class) return a.Class.localeCompare(b.Class);
    if (a.Team !== b.Team) return a.Team.localeCompare(b.Team);
    return a.Student.localeCompare(b.Student);
  });

  function downloadMerged() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roster), "Roster");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamScores), "TeamScores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(individualScores), "IndividualScores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overall), "Overall");
    XLSX.writeFile(wb, "review-grader-master.xlsx");
  }

  function reset() {
    setRoster([]);
    setTeamScores([]);
    setIndividualScores([]);
    setFileNames([]);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merge reviewer exports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the .xlsx each reviewer exported (one per class, or several from the same
          class over time) and get one consolidated master workbook. Runs entirely in your
          browser - nothing is uploaded anywhere.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="text-center py-8">
          <input
            type="file"
            accept=".xlsx"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="text-sm"
          />
          {fileNames.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">Loaded: {fileNames.join(", ")}</p>
          )}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {overall.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {overall.length} students across {new Set(overall.map((r) => r.Class)).size} class(es)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Clear
              </Button>
              <Button onClick={downloadMerged}>Download master .xlsx</Button>
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Class</th>
                    <th className="text-left px-3 py-2 font-medium">Team</th>
                    <th className="text-left px-3 py-2 font-medium">Student</th>
                    <th className="text-right px-3 py-2 font-medium">Reviews scored</th>
                    <th className="text-right px-3 py-2 font-medium">Overall final score</th>
                  </tr>
                </thead>
                <tbody>
                  {overall.map((row) => (
                    <tr key={`${row.Class}-${row.Team}-${row.Student}`} className="border-t">
                      <td className="px-3 py-2">{row.Class}</td>
                      <td className="px-3 py-2">{row.Team}</td>
                      <td className="px-3 py-2">{row.Student}</td>
                      <td className="px-3 py-2 text-right">{row.ReviewsScored}/4</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {row.OverallFinalScore ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
