import { NextRequest, NextResponse } from "next/server";
import { getScoresForClass } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });
  return NextResponse.json(getScoresForClass(classId));
}
