"use client";

import { useState } from "react";
import { generateSession, type GeneratedQuestion } from "@/lib/question-generator";
import type { CriterionDef, TeamScoreRow } from "@/lib/types";

export default function QuestionSession({
  studentName,
  criteria,
  teamScoresByCriterion,
  onAppendNotes,
}: {
  studentName: string;
  criteria: CriterionDef[];
  teamScoresByCriterion: Record<string, TeamScoreRow | undefined>;
  onAppendNotes: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<GeneratedQuestion[]>([]);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});

  function regenerate() {
    setSession(generateSession({ criteria, teamScoresByCriterion, count: 5 }));
    setAnswered({});
    setOpen(true);
  }

  function copyToNotes() {
    const summary = session
      .map((q, i) => `Q${i + 1} (${q.category}${q.weak ? ", weak spot" : ""}): ${q.question}`)
      .join("\n");
    onAppendNotes(summary);
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={regenerate}
          className="text-xs border border-black/15 dark:border-white/20 rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
        >
          {session.length > 0 ? "Regenerate" : "Simulate session (5 Qs)"}
        </button>
        {session.length > 0 && (
          <>
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-blue-600 dark:text-blue-400"
            >
              {open ? "Hide" : "Show"} questions
            </button>
            <button onClick={copyToNotes} className="text-xs text-black/50 dark:text-white/50 hover:underline">
              Copy to notes
            </button>
          </>
        )}
      </div>

      {open && session.length > 0 && (
        <ol className="mt-2 space-y-2 border border-black/10 dark:border-white/10 rounded-md p-3">
          {session.map((q, i) => (
            <li key={`${q.criterionId}-${i}`} className="text-xs border-t border-black/5 dark:border-white/10 pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={!!answered[i]}
                  onChange={(e) => setAnswered((prev) => ({ ...prev, [i]: e.target.checked }))}
                  className="mt-0.5"
                  aria-label={`Mark question ${i + 1} for ${studentName} as asked`}
                />
                <div className="flex-1">
                  <p className="font-medium text-black/80 dark:text-white/80">
                    <span
                      className={`inline-block text-[9px] uppercase tracking-wide mr-1.5 px-1 py-0.5 rounded ${
                        q.category === "Security"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                      }`}
                    >
                      {q.category}
                    </span>
                    {q.weak && (
                      <span className="inline-block text-[9px] uppercase tracking-wide mr-1.5 px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        team weak spot
                      </span>
                    )}
                    {q.question}
                  </p>
                  <p className="text-black/50 dark:text-white/50 mt-0.5">
                    Listen for: {q.guidance}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
