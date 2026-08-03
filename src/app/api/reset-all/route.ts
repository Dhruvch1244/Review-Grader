import { NextResponse } from "next/server";
import { resetAllScoring } from "@/lib/queries";

export async function DELETE() {
  resetAllScoring();
  return NextResponse.json({ ok: true });
}
