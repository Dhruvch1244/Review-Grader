import { NextRequest, NextResponse } from "next/server";
import { addStudent } from "@/lib/queries";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const student = addStudent(id, body?.name);
  return NextResponse.json(student, { status: 201 });
}
