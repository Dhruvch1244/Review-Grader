import { NextRequest, NextResponse } from "next/server";
import { listClasses, createClassWithTeams } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(listClasses());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.headcount) {
    return NextResponse.json({ error: "name and headcount are required" }, { status: 400 });
  }
  const data = createClassWithTeams({
    name: body.name,
    instructorName: body.instructorName,
    headcount: Number(body.headcount),
    teamSize: body.teamSize ? Number(body.teamSize) : undefined,
  });
  return NextResponse.json(data, { status: 201 });
}
