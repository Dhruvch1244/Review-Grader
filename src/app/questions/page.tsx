"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiWrite } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { QuestionBankCriterion } from "@/lib/queries";
import type { QuestionVariant } from "@/lib/types";

export default function QuestionBankPage() {
  const [bank, setBank] = useState<QuestionBankCriterion[]>([]);
  const [reviewId, setReviewId] = useState<string>("r1");

  async function refresh() {
    const data = await apiGet<QuestionBankCriterion[]>("/api/question-bank");
    setBank(data ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    refresh();
  }, []);

  const reviewIds = useMemo(() => Array.from(new Set(bank.map((c) => c.reviewId))), [bank]);
  const reviewLabels = useMemo(
    () => Object.fromEntries(bank.map((c) => [c.reviewId, c.reviewLabel])),
    [bank]
  );
  const criteriaForReview = bank.filter((c) => c.reviewId === reviewId);

  function updateCriterionLocally(id: string, patch: Partial<QuestionBankCriterion>) {
    setBank((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Question bank</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the reviewer guidance and the question phrasings used when generating an
          individual Q&amp;A session for each rubric criterion.
        </p>
      </div>

      {reviewIds.length > 0 && (
        <Tabs value={reviewId} onValueChange={setReviewId}>
          <TabsList>
            {reviewIds.map((id) => (
              <TabsTrigger key={id} value={id}>
                {reviewLabels[id]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="space-y-4">
        {criteriaForReview.map((c) => (
          <CriterionEditor key={c.id} criterion={c} onUpdate={(patch) => updateCriterionLocally(c.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function CriterionEditor({
  criterion,
  onUpdate,
}: {
  criterion: QuestionBankCriterion;
  onUpdate: (patch: Partial<QuestionBankCriterion>) => void;
}) {
  const [guidance, setGuidance] = useState(criterion.guidance ?? "");
  const [newQuestion, setNewQuestion] = useState("");

  async function saveGuidance() {
    await apiWrite("PATCH", `/api/question-bank/guidance/${criterion.id}`, { guidance });
    onUpdate({ guidance });
  }

  async function addQuestion() {
    const text = newQuestion.trim();
    if (!text) return;
    const variant = await apiWrite<QuestionVariant>("POST", "/api/question-bank/questions", {
      criterionId: criterion.id,
      text,
    });
    onUpdate({ questions: [...criterion.questions, variant] });
    setNewQuestion("");
    toast.success("Question added");
  }

  async function updateQuestion(id: string, text: string) {
    await apiWrite("PATCH", `/api/question-bank/questions/${id}`, { text }, `q-${id}`);
    onUpdate({ questions: criterion.questions.map((q) => (q.id === id ? { ...q, text } : q)) });
  }

  async function deleteQuestion(id: string) {
    if (criterion.questions.length <= 1) {
      toast.error("Keep at least one question phrasing per criterion.");
      return;
    }
    await apiWrite("DELETE", `/api/question-bank/questions/${id}`);
    onUpdate({ questions: criterion.questions.filter((q) => q.id !== id) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal leading-relaxed">
          <Badge variant={criterion.category === "Security" ? "secondary" : "outline"} className="mr-2 align-middle">
            {criterion.category}
          </Badge>
          {criterion.text}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Reviewer guidance</p>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onBlur={saveGuidance}
            rows={2}
            className="w-full text-sm border rounded-md px-3 py-2 bg-background"
            placeholder="What a strong answer covers…"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Question phrasings ({criterion.questions.length})
          </p>
          <div className="space-y-1.5">
            {criterion.questions.map((q) => (
              <div key={q.id} className="flex items-start gap-1.5">
                <textarea
                  defaultValue={q.text}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== q.text && updateQuestion(q.id, e.target.value.trim())}
                  rows={1}
                  className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background resize-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteQuestion(q.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
              placeholder="Add another phrasing of this question…"
              className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background"
            />
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
