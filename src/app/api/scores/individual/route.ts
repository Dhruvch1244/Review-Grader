import { NextRequest, NextResponse } from "next/server";
import { upsertIndividualScore } from "@/lib/queries";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.studentId || !body.reviewId) {
    return NextResponse.json({ error: "studentId, reviewId are required" }, { status: 400 });
  }
  const row = upsertIndividualScore({
    studentId: body.studentId,
    reviewId: body.reviewId,
    delta: body.delta ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json(row);
}
