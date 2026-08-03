import { NextRequest, NextResponse } from "next/server";
import { upsertQuestionRating } from "@/lib/queries";
import type { QuestionRating } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { studentId, reviewId, criterionId, rating } = body as {
    studentId: string;
    reviewId: string;
    criterionId: string;
    rating: QuestionRating | null;
  };
  if (!studentId || !reviewId || !criterionId) {
    return NextResponse.json({ error: "studentId, reviewId, criterionId are required" }, { status: 400 });
  }
  const result = upsertQuestionRating(studentId, reviewId, criterionId, rating ?? null);
  return NextResponse.json(result);
}
