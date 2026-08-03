import { NextResponse } from "next/server";
import { listReviews } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(listReviews());
}
