export interface RawStudentScore {
  classId: string;
  className: string;
  team: string;
  student: string;
  raw: number;
}

export interface ClassNormSummary {
  classId: string;
  className: string;
  mean: number;
  stddev: number;
  studentCount: number;
}

export interface StudentNormRow extends RawStudentScore {
  z: number;
  normalized: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Cross-class fairness normalization: converts each student's raw overall
 * score into a z-score against their OWN class's mean/stddev, then rescales
 * to a T-score-like 0-100 band (mean 50, sd 10) so a "3.8" from a strict
 * class and a "4.3" from a lenient one become comparable.
 */
export function computeNormalization(
  rows: RawStudentScore[]
): { perClass: ClassNormSummary[]; students: StudentNormRow[] } {
  const byClass = new Map<string, RawStudentScore[]>();
  for (const r of rows) {
    if (!byClass.has(r.classId)) byClass.set(r.classId, []);
    byClass.get(r.classId)!.push(r);
  }

  const perClass: ClassNormSummary[] = [];
  const students: StudentNormRow[] = [];

  for (const [classId, list] of byClass) {
    const vals = list.map((s) => s.raw);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const stddev = Math.sqrt(variance);
    perClass.push({
      classId,
      className: list[0].className,
      mean: round2(mean),
      stddev: round2(stddev),
      studentCount: vals.length,
    });
    for (const s of list) {
      const z = stddev > 0 ? (s.raw - mean) / stddev : 0;
      const normalized = Math.max(0, Math.min(100, 50 + 10 * z));
      students.push({ ...s, z: round2(z), normalized: round2(normalized) });
    }
  }

  perClass.sort((a, b) => a.className.localeCompare(b.className));
  students.sort((a, b) => b.normalized - a.normalized);

  return { perClass, students };
}
