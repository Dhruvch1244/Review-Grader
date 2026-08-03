"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiWrite } from "@/lib/api-client";
import QuestionSession from "@/components/QuestionSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
  const [resetNonce, setResetNonce] = useState(0);
  const notesRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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

  /** Syncs local state after the question-ratings endpoint has already persisted the delta server-side. */
  function setDeltaLocal(studentId: string, delta: number | null) {
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    setIndividualScores((prev) => ({
      ...prev,
      [key]: {
        id: key,
        student_id: studentId,
        review_id: review.id,
        delta,
        notes: prev[key]?.notes ?? null,
        updated_at: new Date().toISOString(),
      },
    }));
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

  function appendIndividualNotes(studentId: string, text: string) {
    if (!review) return;
    const el = notesRefs.current[studentId];
    const existing = el?.value ?? individualScores[`${studentId}:${review.id}`]?.notes ?? "";
    const next = existing ? `${existing}\n${text}` : text;
    if (el) el.value = next;
    setIndividualNotes(studentId, next);
  }

  async function resetTeam() {
    if (!team) return;
    if (!window.confirm(`Reset all scores, ratings, and session state for ${team.name}? This can't be undone.`)) {
      return;
    }
    await apiWrite("DELETE", `/api/teams/${team.id}/reset`);
    const studentIds = new Set(team.students.map((s) => s.id));
    setTeamScores((prev) => Object.fromEntries(Object.entries(prev).filter(([, v]) => v.team_id !== team.id)));
    setIndividualScores((prev) => Object.fromEntries(Object.entries(prev).filter(([, v]) => !studentIds.has(v.student_id))));
    setResetNonce((n) => n + 1);
    toast.success(`${team.name} reset`);
  }

  if (!classData) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{classData.class.name}</h1>
          <p className="text-sm text-muted-foreground">{classData.class.reviewer_name ?? "No reviewer set"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/stats/${classData.class.id}`}>
            <Button variant="outline">Stats</Button>
          </Link>
          <a href={`/api/export?classId=${classData.class.id}`}>
            <Button>Export .xlsx</Button>
          </a>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {reviews.map((r) => (
          <Button
            key={r.id}
            variant={r.id === reviewId ? "default" : "outline"}
            className="h-auto flex-col items-start py-1.5 px-3"
            onClick={() => setReviewId(r.id)}
          >
            <span className="text-sm">R{r.number}: {r.label}</span>
            <span className="text-[10px] opacity-70 font-normal">{r.sprintRange}</span>
          </Button>
        ))}
      </div>

      <div className="flex gap-4">
        <aside className="w-48 shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Teams</p>
          <ul className="space-y-1">
            {classData.teams.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTeamId(t.id)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                    t.id === teamId ? "bg-accent font-medium" : "hover:bg-accent/50"
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
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Run this as a guided, timed review</p>
                  <p className="text-xs text-muted-foreground">
                    20-minute presentation clock, then walks through each student&apos;s Q&amp;A one at a time.
                  </p>
                </div>
                <Link href={`/review/${classData.class.id}/${review.id}/${team.id}`}>
                  <Button>
                    <PlayCircle className="size-4" /> Start guided review
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">Team baseline - {team.name}</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    Avg: <strong>{teamAvg ?? "—"}</strong> / 5
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={resetTeam}>
                    <RotateCcw className="size-3.5" /> Reset team
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {review.criteria.map((c) => {
                    const key = `${team.id}:${review.id}:${c.id}`;
                    const current = teamScores[key];
                    return (
                      <li key={key} className="border-t pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm flex-1">
                            <Badge variant={c.category === "Security" ? "secondary" : "outline"} className="mr-2 align-middle">
                              {c.category}
                            </Badge>
                            {c.text}
                          </p>
                          <div className="flex gap-1 shrink-0">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Button
                                key={n}
                                size="sm"
                                variant={current?.score === n ? "default" : "outline"}
                                className="size-7 p-0 text-xs"
                                onClick={() => setCriterionScore(c.id, n)}
                              >
                                {n}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <input
                          defaultValue={current?.notes ?? ""}
                          onBlur={(e) => setCriterionNotes(c.id, e.target.value)}
                          placeholder="notes (optional)"
                          className="mt-1.5 w-full text-xs border rounded px-2 py-1 bg-background"
                        />
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Individual Q&amp;A - {review.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {team.students.map((s) => {
                    const key = `${s.id}:${review.id}`;
                    const current = individualScores[key];
                    const final =
                      teamAvg !== null && typeof current?.delta === "number"
                        ? Math.round((teamAvg + current.delta) * 100) / 100
                        : teamAvg;
                    return (
                      <li key={`${key}:${resetNonce}`} className="border-t pt-3 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm flex-1">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Final: <strong>{final ?? "—"}</strong>
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {[-2, -1, 0, 1, 2].map((n) => (
                              <Button
                                key={n}
                                size="sm"
                                variant={current?.delta === n ? "default" : "outline"}
                                className="h-7 px-2 text-xs"
                                onClick={() => setDelta(s.id, n)}
                              >
                                {n > 0 ? `+${n}` : n}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          ref={(el) => {
                            notesRefs.current[s.id] = el;
                          }}
                          defaultValue={current?.notes ?? ""}
                          onBlur={(e) => setIndividualNotes(s.id, e.target.value)}
                          placeholder="notes (optional)"
                          rows={2}
                          className="mt-1.5 w-full text-xs border rounded px-2 py-1 bg-background"
                        />
                        <QuestionSession
                          studentId={s.id}
                          teamId={team.id}
                          reviewId={review.id}
                          onAppendNotes={(text) => appendIndividualNotes(s.id, text)}
                          onDeltaChange={(delta) => setDeltaLocal(s.id, delta)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
