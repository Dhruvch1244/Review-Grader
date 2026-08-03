import type { CriterionDef, TeamScoreRow } from "./types";
import { QUESTION_BANK } from "./question-bank";

export interface GeneratedQuestion {
  criterionId: string;
  category: CriterionDef["category"];
  criterionText: string;
  question: string;
  guidance: string;
  teamScore: number | null;
  weak: boolean;
}

/**
 * Picks `count` criteria for a student's individual Q&A session, weighted
 * toward whatever the team scored low or left unscored for this review -
 * the idea being to probe exactly what the team's presentation didn't
 * convincingly cover. Falls back to an even spread across all criteria
 * once the weak ones are used up.
 */
export function generateSession(params: {
  criteria: CriterionDef[];
  teamScoresByCriterion: Record<string, TeamScoreRow | undefined>;
  count?: number;
}): GeneratedQuestion[] {
  const { criteria, teamScoresByCriterion } = params;
  const count = Math.min(params.count ?? 5, criteria.length);

  const pool = criteria.map((c) => {
    const score = teamScoresByCriterion[c.id]?.score ?? null;
    const weight = score === null ? 4 : score <= 2 ? 3 : score === 3 ? 2 : 1;
    return { criterion: c, score, weight };
  });

  const picked: typeof pool = [];
  const remaining = [...pool];
  while (picked.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      threshold -= remaining[idx].weight;
      if (threshold <= 0) break;
    }
    const chosen = remaining.splice(Math.min(idx, remaining.length - 1), 1)[0];
    picked.push(chosen);
  }

  return picked.map(({ criterion, score }) => {
    const bank = QUESTION_BANK[criterion.id];
    const question = bank
      ? bank.questions[Math.floor(Math.random() * bank.questions.length)]
      : `Tell me more about how your team addressed: ${criterion.text}`;
    return {
      criterionId: criterion.id,
      category: criterion.category,
      criterionText: criterion.text,
      question,
      guidance: bank?.guidance ?? "Listen for a specific, concrete answer tied to their own implementation.",
      teamScore: score,
      weak: score === null || score <= 2,
    };
  });
}
