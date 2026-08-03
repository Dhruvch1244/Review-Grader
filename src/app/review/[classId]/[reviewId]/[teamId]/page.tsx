"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiWrite } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import QuestionSession from "@/components/QuestionSession";
import { toast } from "sonner";
import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  IndividualScoreRow,
  ReviewSessionRow,
} from "@/lib/types";

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

const GRACE_OPTIONS = [-1, -0.5, 0, 0.5, 1];

export default function ReviewSessionPage() {
  const { classId, reviewId, teamId } = useParams<{ classId: string; reviewId: string; teamId: string }>();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [reviews, setReviews] = useState<ReviewWithCriteria[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, TeamScoreRow>>({});
  const [individualScores, setIndividualScores] = useState<Record<string, IndividualScoreRow>>({});
  const [session, setSession] = useState<ReviewSessionRow | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const autoAdvancedRef = useRef(false);

  useEffect(() => {
    apiGet<ClassData>(`/api/classes/${classId}`).then((d) => d && setClassData(d));
    apiGet<ReviewWithCriteria[]>("/api/reviews").then((r) => setReviews(r ?? []));
    apiGet<{ teamScores: TeamScoreRow[]; individualScores: IndividualScoreRow[] }>(
      `/api/scores?classId=${classId}`
    ).then((d) => {
      if (!d) return;
      setTeamScores(Object.fromEntries(d.teamScores.map((s) => [s.id, s])));
      setIndividualScores(Object.fromEntries(d.individualScores.map((s) => [s.id, s])));
    });
    apiGet<ReviewSessionRow>(`/api/review-sessions?teamId=${teamId}&reviewId=${reviewId}`).then(
      (s) => s && setSession(s)
    );
  }, [classId, reviewId, teamId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const team = classData?.teams.find((t) => t.id === teamId) ?? null;
  const review = reviews.find((r) => r.id === reviewId) ?? null;

  const teamAvg = useMemo(() => {
    if (!team || !review) return null;
    const vals = review.criteria
      .map((c) => teamScores[`${teamId}:${reviewId}:${c.id}`]?.score)
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }, [team, review, teamScores, teamId, reviewId]);

  async function patchSession(patch: Partial<ReviewSessionRow>) {
    const updated = await apiWrite<ReviewSessionRow>("PATCH", "/api/review-sessions", {
      teamId,
      reviewId,
      ...patch,
    });
    setSession(updated);
    return updated;
  }

  async function startPresentation() {
    await patchSession({
      phase: "presentation",
      timer_started_at: new Date().toISOString(),
      current_student_index: 0,
    });
    toast.success("Presentation started - 20:00 on the clock");
  }

  const remainingSeconds = useMemo(() => {
    if (!session) return 1200;
    if (!session.timer_started_at) return session.timer_duration_seconds;
    const elapsed = (now - new Date(session.timer_started_at).getTime()) / 1000;
    return Math.max(0, Math.round(session.timer_duration_seconds - elapsed));
  }, [session, now]);

  useEffect(() => {
    if (session?.phase === "presentation" && remainingSeconds <= 0 && !autoAdvancedRef.current) {
      autoAdvancedRef.current = true;
      toast.info("Presentation time's up - moving to individual Q&A");
      patchSession({ phase: "individual", current_student_index: 0 });
    }
    if (session?.phase !== "presentation") autoAdvancedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, remainingSeconds]);

  async function setCriterionScore(criterionId: string, score: number) {
    if (!review) return;
    const key = `${teamId}:${reviewId}:${criterionId}`;
    const existingNotes = teamScores[key]?.notes ?? null;
    setTeamScores((prev) => ({
      ...prev,
      [key]: {
        id: key,
        team_id: teamId,
        review_id: reviewId,
        criterion_id: criterionId,
        score,
        notes: existingNotes,
        updated_at: new Date().toISOString(),
      },
    }));
    await apiWrite(
      "PUT",
      "/api/scores/team",
      { teamId, reviewId, criterionId, score, notes: existingNotes },
      `team-score-${key}`
    );
  }

  function studentKey(studentId: string) {
    return `${studentId}:${reviewId}`;
  }

  async function setGrace(studentId: string, grace: number) {
    const row = await apiWrite<IndividualScoreRow>(
      "PUT",
      "/api/scores/grace",
      { studentId, reviewId, grace },
      `grace-${studentId}`
    );
    setIndividualScores((prev) => ({ ...prev, [studentKey(studentId)]: { ...prev[studentKey(studentId)], ...row } }));
  }

  function setDeltaLocal(studentId: string, delta: number | null) {
    const key = studentKey(studentId);
    setIndividualScores((prev) => ({
      ...prev,
      [key]: {
        id: key,
        student_id: studentId,
        review_id: reviewId,
        delta,
        notes: prev[key]?.notes ?? null,
        updated_at: new Date().toISOString(),
      },
    }));
  }

  if (!classData || !review || !team || !session) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const mm = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(remainingSeconds % 60)
    .toString()
    .padStart(2, "0");
  const pct = Math.min(
    100,
    Math.max(0, ((session.timer_duration_seconds - remainingSeconds) / session.timer_duration_seconds) * 100)
  );
  const timerColor = remainingSeconds > 300 ? "text-emerald-600" : remainingSeconds > 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className={`space-y-6 mx-auto ${session.phase === "individual" ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {team.name} - {review.label}
          </h1>
          <p className="text-sm text-muted-foreground">{classData.class.name}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {session.phase}
        </Badge>
      </div>

      {session.phase === "idle" && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ready to review {team.name}. The presentation gets a 20-minute clock - score the
              rubric live as they present, then work through each person&apos;s individual Q&amp;A.
            </p>
            <Button size="lg" onClick={startPresentation}>
              Start presentation
            </Button>
          </CardContent>
        </Card>
      )}

      {session.phase === "presentation" && (
        <>
          <Card>
            <CardContent className="py-6 flex flex-col items-center gap-3">
              <p className={`text-5xl font-semibold tabular-nums ${timerColor}`}>
                {mm}:{ss}
              </p>
              <Progress value={pct} className="w-full max-w-sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => patchSession({ phase: "individual", current_student_index: 0 })}
              >
                End presentation now
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Score live - Avg: {teamAvg ?? "—"} / 5</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {review.criteria.map((c) => {
                  const key = `${teamId}:${reviewId}:${c.id}`;
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
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {session.phase === "individual" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Individual Q&amp;A - everyone at once</h2>
              <p className="text-xs text-muted-foreground">
                Each person got a different 5-question set weighted toward the team&apos;s weak
                spots. Rate as you go through each person, then finish whenever you&apos;re ready.
              </p>
            </div>
            <Button onClick={() => patchSession({ phase: "final" })}>Finish Q&amp;A</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {team.students.map((s) => {
              const final =
                teamAvg !== null && typeof individualScores[studentKey(s.id)]?.delta === "number"
                  ? Math.round((teamAvg + individualScores[studentKey(s.id)]!.delta!) * 100) / 100
                  : teamAvg;
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Final so far: <strong>{final ?? "—"}</strong>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <QuestionSession
                      studentId={s.id}
                      teamId={teamId}
                      reviewId={reviewId}
                      onAppendNotes={() => {}}
                      onDeltaChange={(d) => setDeltaLocal(s.id, d)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {session.phase === "final" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Final review - add grace marks if needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.students.map((s) => {
              const ind = individualScores[studentKey(s.id)];
              const delta = ind?.delta ?? 0;
              const grace = ind?.grace ?? 0;
              const final = teamAvg !== null ? Math.round((teamAvg + delta + grace) * 100) / 100 : null;
              return (
                <div key={s.id} className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      team {teamAvg ?? "—"} + delta {delta} + grace {grace} = <strong>{final ?? "—"}</strong>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {GRACE_OPTIONS.map((g) => (
                      <Button
                        key={g}
                        size="sm"
                        variant={grace === g ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setGrace(s.id, g)}
                      >
                        {g > 0 ? `+${g}` : g}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
            <Button className="mt-2" onClick={() => patchSession({ phase: "done" }).then(() => toast.success("Review marked complete"))}>
              Mark review complete
            </Button>
          </CardContent>
        </Card>
      )}

      {session.phase === "done" && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {team.name}&apos;s {review.label} review is complete.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href={`/stats/${classId}`}>
                <Button variant="outline">View stats</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => patchSession({ phase: "idle", timer_started_at: null, current_student_index: 0 })}
              >
                Restart this session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
