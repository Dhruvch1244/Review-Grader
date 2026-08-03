"use client";

import { useEffect, useState } from "react";
import { apiGet, apiWrite } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedQuestion } from "@/lib/question-generator";
import type { QuestionRating, QuestionRatingRow } from "@/lib/types";

const RATING_OPTIONS: { value: QuestionRating; label: string }[] = [
  { value: "unanswered", label: "Unanswered" },
  { value: "middle", label: "Middle" },
  { value: "answered", label: "Answered" },
];

const RATING_DOT: Record<QuestionRating, string> = {
  unanswered: "bg-destructive",
  middle: "bg-amber-500",
  answered: "bg-emerald-500",
};

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
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggleOpen(criterionId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(criterionId)) next.delete(criterionId);
      else next.add(criterionId);
      return next;
    });
  }

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

  async function setRating(criterionId: string, next: QuestionRating | null) {
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

  function rate(criterionId: string, rating: QuestionRating) {
    const next = ratings[criterionId] === rating ? null : rating;
    setRating(criterionId, next);
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
        <ol className="rounded-lg border divide-y bg-muted/30 overflow-hidden">
          {questions.map((q, i) => {
            const isOpen = openIds.has(q.criterionId);
            const rating = ratings[q.criterionId];
            return (
              <li key={`${q.criterionId}-${i}`} className="text-xs">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleOpen(q.criterionId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleOpen(q.criterionId);
                    }
                  }}
                  className="w-full flex items-start gap-2 px-2.5 py-2 cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <Checkbox
                    checked={rating === "answered"}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => setRating(q.criterionId, checked ? "answered" : null)}
                    aria-label="Mark question complete"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant={q.category === "Security" ? "secondary" : "outline"} className="h-4 px-1 text-[9px] uppercase tracking-wide shrink-0">
                        {q.category}
                      </Badge>
                      {q.weak && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px] uppercase tracking-wide shrink-0">
                          weak spot
                        </Badge>
                      )}
                      {rating && (
                        <span className={cn("size-1.5 rounded-full shrink-0", RATING_DOT[rating])} title={rating} />
                      )}
                    </div>
                    <p className="font-medium text-foreground leading-snug">{q.question}</p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
                {isOpen && (
                  <div className="px-2.5 pb-2.5 pt-0.5 space-y-2">
                    <p className="text-muted-foreground">Listen for: {q.guidance}</p>
                    <div className="flex gap-1">
                      {RATING_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={rating === opt.value ? "default" : "outline"}
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => rate(q.criterionId, opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
