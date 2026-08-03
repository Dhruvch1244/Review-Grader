"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { buildSummaryRows, overallByStudent } from "@/lib/rollup";
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
        <h1 className="text-xl font-semibold">Merge reviewer exports</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Upload the .xlsx each instructor exported (one per class, or several from the same
          class over time) and get one consolidated master workbook. Runs entirely in your
          browser - nothing is uploaded anywhere.
        </p>
      </div>

      <div className="border border-dashed border-black/20 dark:border-white/25 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".xlsx"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm"
        />
        {fileNames.length > 0 && (
          <p className="text-xs text-black/50 mt-3">Loaded: {fileNames.join(", ")}</p>
        )}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      {overall.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-black/60 dark:text-white/60">
              {overall.length} students across {new Set(overall.map((r) => r.Class)).size} class(es)
            </p>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="text-sm border border-black/15 dark:border-white/20 px-3 py-1.5 rounded-md"
              >
                Clear
              </button>
              <button
                onClick={downloadMerged}
                className="text-sm bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-md"
              >
                Download master .xlsx
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/5">
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
                  <tr key={`${row.Class}-${row.Team}-${row.Student}`} className="border-t border-black/5 dark:border-white/10">
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
        </>
      )}
    </div>
  );
}
