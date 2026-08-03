import { NextResponse } from "next/server";
import { getQuestionBank } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(getQuestionBank());
}
