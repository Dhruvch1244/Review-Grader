import { NextRequest, NextResponse } from "next/server";
import { updateQuestionVariant, deleteQuestionVariant } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  updateQuestionVariant(id, body.text);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteQuestionVariant(id);
  return NextResponse.json({ ok: true });
}
