import { NextRequest, NextResponse } from "next/server";
import {
  getQuestionSession,
  saveQuestionSession,
  getTeammateUsedCriteria,
  getTeamScoresByCriterion,
  getQuestionBank,
  listReviews,
  getQuestionRatings,
} from "@/lib/queries";
import { generateSession, type QuestionBankEntry, type GeneratedQuestion } from "@/lib/question-generator";
import type { QuestionSessionRow, CriterionDef, TeamScoreRow } from "@/lib/types";

function bankAsRecord(): Record<string, QuestionBankEntry> {
  const bank = getQuestionBank();
  return Object.fromEntries(
    bank.map((c) => [c.id, { questions: c.questions.map((q) => q.text), guidance: c.guidance ?? "" }])
  );
}

/** Rebuilds the display shape for an already-saved session, re-checking the
 * team's CURRENT scores so the weak-spot badge stays accurate even after
 * the team's baseline changes post-generation. */
function resolveSession(
  session: QuestionSessionRow,
  criteria: CriterionDef[],
  bank: Record<string, QuestionBankEntry>,
  teamScoresByCriterion: Record<string, TeamScoreRow>
): GeneratedQuestion[] {
  return session.criterion_ids
    .map((cid) => criteria.find((c) => c.id === cid))
    .filter((c): c is CriterionDef => !!c)
    .map((c) => {
      const score = teamScoresByCriterion[c.id]?.score ?? null;
      return {
        criterionId: c.id,
        category: c.category,
        criterionText: c.text,
        question: bank[c.id]?.questions[0] ?? c.text,
        guidance: bank[c.id]?.guidance ?? "",
        teamScore: score,
        weak: score === null || score <= 2,
      };
    });
}

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get("studentId");
  const reviewId = req.nextUrl.searchParams.get("reviewId");
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!studentId || !reviewId) {
    return NextResponse.json({ error: "studentId and reviewId are required" }, { status: 400 });
  }
  const session = getQuestionSession(studentId, reviewId);
  if (!session) return NextResponse.json({ session: null, questions: [], ratings: [] });

  const review = listReviews().find((r) => r.id === reviewId);
  const bank = bankAsRecord();
  const ratings = getQuestionRatings(studentId, reviewId);
  const teamScoresByCriterion = teamId ? getTeamScoresByCriterion(teamId, reviewId) : {};
  const questions = resolveSession(session, review?.criteria ?? [], bank, teamScoresByCriterion);
  return NextResponse.json({ session, questions, ratings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { studentId, teamId, reviewId, regenerate } = body as {
    studentId: string;
    teamId: string;
    reviewId: string;
    regenerate?: boolean;
  };
  if (!studentId || !teamId || !reviewId) {
    return NextResponse.json({ error: "studentId, teamId, reviewId are required" }, { status: 400 });
  }

  const review = listReviews().find((r) => r.id === reviewId);
  if (!review) return NextResponse.json({ error: "review not found" }, { status: 404 });
  const bank = bankAsRecord();
  const teamScoresByCriterion = getTeamScoresByCriterion(teamId, reviewId);

  if (!regenerate) {
    const existing = getQuestionSession(studentId, reviewId);
    if (existing) {
      const ratings = getQuestionRatings(studentId, reviewId);
      const questions = resolveSession(existing, review.criteria, bank, teamScoresByCriterion);
      return NextResponse.json({ session: existing, questions, ratings });
    }
  }

  const excludeCriterionIds = getTeammateUsedCriteria(teamId, reviewId, studentId);
  const generated = generateSession({
    criteria: review.criteria,
    teamScoresByCriterion,
    bank,
    excludeCriterionIds,
    count: 5,
  });

  const session = saveQuestionSession(
    studentId,
    reviewId,
    generated.map((q) => q.criterionId)
  );
  return NextResponse.json({ session, questions: generated, ratings: [] });
}
