import { NextRequest, NextResponse } from "next/server";
import { upsertTeamScore } from "@/lib/queries";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.teamId || !body.reviewId || !body.criterionId) {
    return NextResponse.json({ error: "teamId, reviewId, criterionId are required" }, { status: 400 });
  }
  const row = upsertTeamScore({
    teamId: body.teamId,
    reviewId: body.reviewId,
    criterionId: body.criterionId,
    score: body.score ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json(row);
}
