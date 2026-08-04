import { Router } from "express";
import {
  getQuestionSession,
  saveQuestionSession,
  getTeammateUsedCriteria,
  getTeamScoresByCriterion,
  getQuestionBank,
  listReviews,
  getQuestionRatings,
} from "../queries";
import { generateSession, type QuestionBankEntry, type GeneratedQuestion } from "../question-generator";
import type { QuestionSessionRow, CriterionDef, TeamScoreRow } from "../types";

export const questionSessionsRouter = Router();

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

questionSessionsRouter.get("/", (req, res) => {
  const studentId = req.query.studentId as string | undefined;
  const reviewId = req.query.reviewId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  if (!studentId || !reviewId) {
    return res.status(400).json({ error: "studentId and reviewId are required" });
  }
  const session = getQuestionSession(studentId, reviewId);
  if (!session) return res.json({ session: null, questions: [], ratings: [] });

  const review = listReviews().find((r) => r.id === reviewId);
  const bank = bankAsRecord();
  const ratings = getQuestionRatings(studentId, reviewId);
  const teamScoresByCriterion = teamId ? getTeamScoresByCriterion(teamId, reviewId) : {};
  const questions = resolveSession(session, review?.criteria ?? [], bank, teamScoresByCriterion);
  res.json({ session, questions, ratings });
});

questionSessionsRouter.post("/", (req, res) => {
  const body = req.body ?? {};
  const { studentId, teamId, reviewId, regenerate } = body as {
    studentId: string;
    teamId: string;
    reviewId: string;
    regenerate?: boolean;
  };
  if (!studentId || !teamId || !reviewId) {
    return res.status(400).json({ error: "studentId, teamId, reviewId are required" });
  }

  const review = listReviews().find((r) => r.id === reviewId);
  if (!review) return res.status(404).json({ error: "review not found" });
  const bank = bankAsRecord();
  const teamScoresByCriterion = getTeamScoresByCriterion(teamId, reviewId);

  if (!regenerate) {
    const existing = getQuestionSession(studentId, reviewId);
    if (existing) {
      const ratings = getQuestionRatings(studentId, reviewId);
      const questions = resolveSession(existing, review.criteria, bank, teamScoresByCriterion);
      return res.json({ session: existing, questions, ratings });
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
  res.json({ session, questions: generated, ratings: [] });
});
