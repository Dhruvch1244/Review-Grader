import { NextRequest, NextResponse } from "next/server";
import { bulkAutofillTeamStudents } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const names: string[] = Array.isArray(body.names) ? body.names : [];
  const team = bulkAutofillTeamStudents(id, names);
  return NextResponse.json(team);
}
