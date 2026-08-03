import { NextRequest, NextResponse } from "next/server";
import { deleteTeam } from "@/lib/queries";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTeam(id);
  return NextResponse.json({ ok: true });
}
