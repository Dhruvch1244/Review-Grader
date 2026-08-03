import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { buildClassWorkbook } from "@/lib/xlsx-export";
import { getClassData } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });
  const data = getClassData(classId);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const wb = buildClassWorkbook(classId);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `review-grader-${data.class.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
