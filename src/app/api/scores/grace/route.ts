import { NextRequest, NextResponse } from "next/server";
import { upsertGrace } from "@/lib/queries";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.studentId || !body.reviewId) {
    return NextResponse.json({ error: "studentId, reviewId are required" }, { status: 400 });
  }
  const row = upsertGrace(body.studentId, body.reviewId, body.grace ?? null);
  return NextResponse.json(row);
}
