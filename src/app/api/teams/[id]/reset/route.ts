import { NextRequest, NextResponse } from "next/server";
import { resetTeamScoring } from "@/lib/queries";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  resetTeamScoring(id);
  return NextResponse.json({ ok: true });
}
