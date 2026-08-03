"use client";

import { useEffect, useState } from "react";
import { apiGet, apiWrite } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeneratedQuestion } from "@/lib/question-generator";
import type { QuestionRating, QuestionRatingRow } from "@/lib/types";

const RATING_OPTIONS: { value: QuestionRating; label: string }[] = [
  { value: "unanswered", label: "Unanswered" },
  { value: "middle", label: "Middle" },
  { value: "answered", label: "Answered" },
];

export default function QuestionSession({
  studentId,
  teamId,
  reviewId,
  onAppendNotes,
  onDeltaChange,
}: {
  studentId: string;
  teamId: string;
  reviewId: string;
  onAppendNotes: (text: string) => void;
  onDeltaChange: (delta: number | null) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [ratings, setRatings] = useState<Record<string, QuestionRating>>({});

  useEffect(() => {
    let cancelled = false;
    apiGet<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
      `/api/question-sessions?studentId=${studentId}&teamId=${teamId}&reviewId=${reviewId}`
    )
      .then(async (data) => {
        if (cancelled) return;
        if (data?.questions?.length) {
          setQuestions(data.questions);
          setRatings(Object.fromEntries(data.ratings.map((r) => [r.criterion_id, r.rating])));
          return;
        }
        // No session yet for this student/review - generate one immediately
        // so the questions and weak spots are visible without an extra click.
        const generated = await apiWrite<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
          "POST",
          "/api/question-sessions",
          { studentId, teamId, reviewId, regenerate: false }
        );
        if (cancelled) return;
        setQuestions(generated.questions ?? []);
        setRatings(Object.fromEntries((generated.ratings ?? []).map((r) => [r.criterion_id, r.rating])));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, teamId, reviewId]);

  async function regenerate() {
    setLoading(true);
    const data = await apiWrite<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
      "POST",
      "/api/question-sessions",
      { studentId, teamId, reviewId, regenerate: true }
    );
    setQuestions(data.questions ?? []);
    setRatings(Object.fromEntries((data.ratings ?? []).map((r) => [r.criterion_id, r.rating])));
    setLoading(false);
  }

  async function rate(criterionId: string, rating: QuestionRating) {
    const next = ratings[criterionId] === rating ? null : rating;
    setRatings((prev) => {
      const copy = { ...prev };
      if (next) copy[criterionId] = next;
      else delete copy[criterionId];
      return copy;
    });
    const result = await apiWrite<{ delta: number | null }>(
      "PUT",
      "/api/question-ratings",
      { studentId, reviewId, criterionId, rating: next },
      `rating-${studentId}-${reviewId}-${criterionId}`
    );
    onDeltaChange(result.delta);
  }

  function copyToNotes() {
    const summary = questions
      .map((q, i) => `Q${i + 1} (${q.category}${q.weak ? ", weak spot" : ""}): ${q.question}`)
      .join("\n");
    onAppendNotes(summary);
  }

  const ratedCount = Object.keys(ratings).length;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={regenerate} disabled={loading}>
          {loading ? "Generating…" : "Regenerate"}
        </Button>
        {questions.length > 0 && (
          <>
            <Button variant="link" size="sm" className="h-7 text-xs px-0 text-muted-foreground" onClick={copyToNotes}>
              Copy to notes
            </Button>
            <span className="text-xs text-muted-foreground">
              {ratedCount}/{questions.length} rated
            </span>
          </>
        )}
      </div>

      {loading && questions.length === 0 && (
        <p className="text-xs text-muted-foreground">Generating questions…</p>
      )}

      {questions.length > 0 && (
        <ol className="space-y-3 rounded-lg border p-3 bg-muted/30">
          {questions.map((q, i) => (
            <li key={`${q.criterionId}-${i}`} className="text-xs border-t pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    <Badge variant={q.category === "Security" ? "secondary" : "outline"} className="mr-1.5 h-4 px-1 text-[9px] uppercase tracking-wide align-middle">
                      {q.category}
                    </Badge>
                    {q.weak && (
                      <Badge variant="destructive" className="mr-1.5 h-4 px-1 text-[9px] uppercase tracking-wide align-middle">
                        weak spot
                      </Badge>
                    )}
                    {q.question}
                  </p>
                  <p className="text-muted-foreground mt-1">Listen for: {q.guidance}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {RATING_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={ratings[q.criterionId] === opt.value ? "default" : "outline"}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => rate(q.criterionId, opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
