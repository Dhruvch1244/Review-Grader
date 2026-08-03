import { NextRequest, NextResponse } from "next/server";
import { getReviewSession, updateReviewSession } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const reviewId = req.nextUrl.searchParams.get("reviewId");
  if (!teamId || !reviewId) {
    return NextResponse.json({ error: "teamId and reviewId are required" }, { status: 400 });
  }
  return NextResponse.json(getReviewSession(teamId, reviewId));
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { teamId, reviewId, ...patch } = body;
  if (!teamId || !reviewId) {
    return NextResponse.json({ error: "teamId and reviewId are required" }, { status: 400 });
  }
  return NextResponse.json(updateReviewSession(teamId, reviewId, patch));
}
