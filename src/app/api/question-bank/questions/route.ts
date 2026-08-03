import { NextRequest, NextResponse } from "next/server";
import { addQuestionVariant } from "@/lib/queries";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.criterionId || !body.text) {
    return NextResponse.json({ error: "criterionId and text are required" }, { status: 400 });
  }
  const variant = addQuestionVariant(body.criterionId, body.text);
  return NextResponse.json(variant, { status: 201 });
}
