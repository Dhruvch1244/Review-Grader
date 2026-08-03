import { NextRequest, NextResponse } from "next/server";
import { reassignStudentTeam } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (typeof body.teamId !== "string") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }
  reassignStudentTeam(id, body.teamId);
  return NextResponse.json({ ok: true });
}
