import { NextRequest, NextResponse } from "next/server";
import { getClassData } from "@/lib/queries";
import { getDb } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getClassData(id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  if (body.instructorName !== undefined) {
    db.prepare("UPDATE classes SET instructor_name = ? WHERE id = ?").run(body.instructorName, id);
  }
  if (body.name !== undefined) {
    db.prepare("UPDATE classes SET name = ? WHERE id = ?").run(body.name, id);
  }
  const data = getClassData(id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}
