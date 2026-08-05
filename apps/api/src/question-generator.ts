import type { CriterionDef, TeamScoreRow } from "./types";

export interface QuestionBankEntry {
  questions: string[];
  guidance: string;
}

export interface GeneratedQuestion {
  criterionId: string;
  category: CriterionDef["category"];
  criterionText: string;
  question: string;
  guidance: string;
  teamScore: number | null;
  weak: boolean;
}

function weightedPick<T extends { weight: number }>(pool: T[], count: number): T[] {
  const picked: T[] = [];
  const remaining = [...pool];
  while (picked.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      threshold -= remaining[idx].weight;
      if (threshold <= 0) break;
    }
    picked.push(remaining.splice(Math.min(idx, remaining.length - 1), 1)[0]);
  }
  return picked;
}

/**
 * Picks `count` criteria for one student's individual Q&A session, weighted
 * toward whatever the team scored low or left unscored - the idea being to
 * probe exactly what the team's presentation didn't convincingly cover.
 * `excludeCriterionIds` (criteria already assigned to teammates this
 * review) are avoided first, so a team's five students don't all get asked
 * about the same one or two things - only reused once every other option
 * is exhausted.
 */
export function generateSession(params: {
  criteria: CriterionDef[];
  teamScoresByCriterion: Record<string, TeamScoreRow | undefined>;
  bank: Record<string, QuestionBankEntry>;
  excludeCriterionIds?: Set<string>;
  count?: number;
}): GeneratedQuestion[] {
  const { criteria, teamScoresByCriterion, bank, excludeCriterionIds } = params;
  const count = Math.min(params.count ?? 5, criteria.length);

  const withWeight = criteria.map((c) => {
    const score = teamScoresByCriterion[c.id]?.score ?? null;
    const weight = score === null ? 4 : score <= 2 ? 3 : score === 3 ? 2 : 1;
    return { criterion: c, score, weight };
  });

  const fresh = withWeight.filter((c) => !excludeCriterionIds?.has(c.criterion.id));
  const reused = withWeight.filter((c) => excludeCriterionIds?.has(c.criterion.id));

  const picked = weightedPick(fresh, count);
  if (picked.length < count) {
    picked.push(...weightedPick(reused, count - picked.length));
  }

  return picked.map(({ criterion, score }) => {
    const entry = bank[criterion.id];
    const question = entry
      ? entry.questions[Math.floor(Math.random() * entry.questions.length)]
      : `Tell me more about how your team addressed: ${criterion.text}`;
    return {
      criterionId: criterion.id,
      category: criterion.category,
      criterionText: criterion.text,
      question,
      guidance: entry?.guidance ?? "Listen for a specific, concrete answer tied to their own implementation.",
      teamScore: score,
      weak: score === null || score <= 2,
    };
  });
}
