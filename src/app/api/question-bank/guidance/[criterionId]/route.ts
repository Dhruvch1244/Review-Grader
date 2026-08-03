import { NextRequest, NextResponse } from "next/server";
import { updateCriterionGuidance } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ criterionId: string }> }) {
  const { criterionId } = await params;
  const body = await req.json();
  if (typeof body.guidance !== "string") {
    return NextResponse.json({ error: "guidance is required" }, { status: 400 });
  }
  updateCriterionGuidance(criterionId, body.guidance);
  return NextResponse.json({ ok: true });
}
