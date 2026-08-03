import { NextRequest, NextResponse } from "next/server";
import { addTeam } from "@/lib/queries";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = addTeam(id);
  return NextResponse.json(team, { status: 201 });
}
