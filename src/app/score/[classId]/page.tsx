"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiWrite } from "@/lib/api-client";
import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  IndividualScoreRow,
} from "@/lib/types";

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

export default function ScorePage() {
  const { classId } = useParams<{ classId: string }>();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [reviews, setReviews] = useState<ReviewWithCriteria[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, TeamScoreRow>>({});
  const [individualScores, setIndividualScores] = useState<Record<string, IndividualScoreRow>>({});
  const [reviewId, setReviewId] = useState<string>("r1");
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    apiGet<ClassData>(`/api/classes/${classId}`).then((data) => {
      if (data) {
        setClassData(data);
        setTeamId((prev) => prev ?? data.teams[0]?.id ?? null);
      }
    });
    apiGet<ReviewWithCriteria[]>("/api/reviews").then((r) => setReviews(r ?? []));
    apiGet<{ teamScores: TeamScoreRow[]; individualScores: IndividualScoreRow[] }>(
      `/api/scores?classId=${classId}`
    ).then((data) => {
      if (!data) return;
      setTeamScores(Object.fromEntries(data.teamScores.map((s) => [s.id, s])));
      setIndividualScores(Object.fromEntries(data.individualScores.map((s) => [s.id, s])));
    });
  }, [classId]);

  const review = reviews.find((r) => r.id === reviewId);
  const team = classData?.teams.find((t) => t.id === teamId) ?? null;

  const teamAvg = useMemo(() => {
    if (!team || !review) return null;
    const vals = review.criteria
      .map((c) => teamScores[`${team.id}:${review.id}:${c.id}`]?.score)
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }, [team, review, teamScores]);

  async function setCriterionScore(criterionId: string, score: number) {
    if (!team || !review) return;
    const key = `${team.id}:${review.id}:${criterionId}`;
    const existingNotes = teamScores[key]?.notes ?? null;
    setTeamScores((prev) => ({
      ...prev,
      [key]: { id: key, team_id: team.id, review_id: review.id, criterion_id: criterionId, score, notes: existingNotes, updated_at: new Date().toISOString() },
    }));
    await apiWrite(
      "PUT",
      "/api/scores/team",
      { teamId: team.id, reviewId: review.id, criterionId, score, notes: existingNotes },
      `team-score-${key}`
    );
  }

  async function setCriterionNotes(criterionId: string, notes: string) {
    if (!team || !review) return;
    const key = `${team.id}:${review.id}:${criterionId}`;
    const existingScore = teamScores[key]?.score ?? null;
    setTeamScores((prev) => ({
      ...prev,
      [key]: { id: key, team_id: team.id, review_id: review.id, criterion_id: criterionId, score: existingScore, notes, updated_at: new Date().toISOString() },
    }));
    await apiWrite(
      "PUT",
      "/api/scores/team",
      { teamId: team.id, reviewId: review.id, criterionId, score: existingScore, notes },
      `team-score-${key}`
    );
  }

  async function setDelta(studentId: string, delta: number) {
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    const existingNotes = individualScores[key]?.notes ?? null;
    setIndividualScores((prev) => ({
      ...prev,
      [key]: { id: key, student_id: studentId, review_id: review.id, delta, notes: existingNotes, updated_at: new Date().toISOString() },
    }));
    await apiWrite(
      "PUT",
      "/api/scores/individual",
      { studentId, reviewId: review.id, delta, notes: existingNotes },
      `ind-score-${key}`
    );
  }

  async function setIndividualNotes(studentId: string, notes: string) {
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    const existingDelta = individualScores[key]?.delta ?? null;
    setIndividualScores((prev) => ({
      ...prev,
      [key]: { id: key, student_id: studentId, review_id: review.id, delta: existingDelta, notes, updated_at: new Date().toISOString() },
    }));
    await apiWrite(
      "PUT",
      "/api/scores/individual",
      { studentId, reviewId: review.id, delta: existingDelta, notes },
      `ind-score-${key}`
    );
  }

  if (!classData) return <p className="text-sm text-black/50">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{classData.class.name}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {classData.class.instructor_name ?? "No instructor set"}
          </p>
        </div>
        <a
          href={`/api/export?classId=${classData.class.id}`}
          className="text-sm bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-md"
        >
          Export .xlsx
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        {reviews.map((r) => (
          <button
            key={r.id}
            onClick={() => setReviewId(r.id)}
            className={`text-sm px-3 py-1.5 rounded-md border ${
              r.id === reviewId
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            R{r.number}: {r.label}
            <span className="block text-[10px] opacity-70">{r.sprintRange}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <aside className="w-48 shrink-0">
          <p className="text-xs font-medium text-black/50 mb-2">Teams</p>
          <ul className="space-y-1">
            {classData.teams.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTeamId(t.id)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md ${
                    t.id === teamId ? "bg-black/10 dark:bg-white/15 font-medium" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {team && review && (
          <div className="flex-1 space-y-6">
            <section className="border border-black/10 dark:border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Team baseline - {team.name}</h2>
                <span className="text-sm">
                  Avg: <strong>{teamAvg ?? "—"}</strong> / 5
                </span>
              </div>
              <ul className="space-y-3">
                {review.criteria.map((c) => {
                  const key = `${team.id}:${review.id}:${c.id}`;
                  const current = teamScores[key];
                  return (
                    <li key={c.id} className="border-t border-black/5 dark:border-white/10 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm flex-1">
                          <span
                            className={`inline-block text-[10px] uppercase tracking-wide mr-2 px-1.5 py-0.5 rounded ${
                              c.category === "Security"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}
                          >
                            {c.category}
                          </span>
                          {c.text}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setCriterionScore(c.id, n)}
                              className={`w-7 h-7 text-xs rounded-md border ${
                                current?.score === n
                                  ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                  : "border-black/15 dark:border-white/20"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        defaultValue={current?.notes ?? ""}
                        onBlur={(e) => setCriterionNotes(c.id, e.target.value)}
                        placeholder="notes (optional)"
                        className="mt-1.5 w-full text-xs border border-black/10 dark:border-white/15 rounded px-2 py-1 bg-transparent"
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="border border-black/10 dark:border-white/10 rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-3">Individual Q&amp;A - {review.label}</h2>
              <ul className="space-y-3">
                {team.students.map((s) => {
                  const key = `${s.id}:${review.id}`;
                  const current = individualScores[key];
                  const final =
                    teamAvg !== null && typeof current?.delta === "number"
                      ? Math.round((teamAvg + current.delta) * 100) / 100
                      : teamAvg;
                  return (
                    <li key={s.id} className="border-t border-black/5 dark:border-white/10 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm flex-1">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-black/50">
                            Final: <strong>{final ?? "—"}</strong>
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {[-2, -1, 0, 1, 2].map((n) => (
                            <button
                              key={n}
                              onClick={() => setDelta(s.id, n)}
                              className={`w-8 h-7 text-xs rounded-md border ${
                                current?.delta === n
                                  ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                                  : "border-black/15 dark:border-white/20"
                              }`}
                            >
                              {n > 0 ? `+${n}` : n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        defaultValue={current?.notes ?? ""}
                        onBlur={(e) => setIndividualNotes(s.id, e.target.value)}
                        placeholder="notes (optional)"
                        className="mt-1.5 w-full text-xs border border-black/10 dark:border-white/15 rounded px-2 py-1 bg-transparent"
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
