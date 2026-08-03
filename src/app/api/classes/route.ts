import { NextResponse } from "next/server";
import { listClasses } from "@/lib/queries";

// Classes are fixed at 6 and auto-seeded on first run (see db.ts) - there
// is no create endpoint; only listing and per-class renames (via
// /api/classes/[id]) and roster management are supported.
export async function GET() {
  return NextResponse.json(listClasses());
}
