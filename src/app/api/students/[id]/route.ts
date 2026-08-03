import { NextRequest, NextResponse } from "next/server";
import { renameStudent } from "@/lib/queries";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  renameStudent(id, body.name);
  return NextResponse.json({ ok: true });
}
