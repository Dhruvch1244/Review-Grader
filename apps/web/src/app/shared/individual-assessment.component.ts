import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ApiClientService } from '../core/services/api-client.service';
import type {
  AskedQuestionRow,
  CriterionDef,
  DimensionDef,
  DimensionScoreRow,
  GradeBand,
  TeamScoreRow,
} from '../core/models/types';
import { GRADE_BAND_LABEL, GRADE_BAND_VALUE } from '../core/models/types';
import { ButtonComponent } from '../ui/button.component';
import { BadgeComponent } from '../ui/badge.component';
import { InputDirective } from '../ui/input.directive';

const BANDS: GradeBand[] = ['below', 'partial', 'meets', 'exceeds'];

@Component({
  selector: 'app-individual-assessment',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent, InputDirective],
  templateUrl: './individual-assessment.component.html',
})
export class IndividualAssessmentComponent {
  private api = inject(ApiClientService);

  studentId = input.required<string>();
  teamId = input.required<string>();
  reviewId = input.required<string>();
  criteria = input.required<CriterionDef[]>();
  teamScores = input.required<Record<string, TeamScoreRow | undefined>>();
  dimensions = input.required<DimensionDef[]>();
  deltaChange = output<number | null>();

  readonly BANDS = BANDS;
  readonly GRADE_BAND_LABEL = GRADE_BAND_LABEL;
  readonly GRADE_BAND_VALUE = GRADE_BAND_VALUE;

  loading = signal(true);
  dimensionScores = signal<DimensionScoreRow[]>([]);
  askedQuestions = signal<AskedQuestionRow[]>([]);
  newQuestionText = signal('');

  strengths = computed(() => this.criteria().filter((c) => (this.teamScores()[c.id]?.score ?? 0) >= 4));
  weaknesses = computed(() =>
    this.criteria().filter((c) => {
      const score = this.teamScores()[c.id]?.score;
      return score === null || score === undefined || score <= 2;
    })
  );

  askedCount = computed(() => this.askedQuestions().length);
  ratedCount = computed(() => this.askedQuestions().filter((q) => q.rating !== null).length);

  constructor() {
    effect(
      (onCleanup) => {
        const studentId = this.studentId();
        const reviewId = this.reviewId();
        let cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });
        this.loading.set(true);
        Promise.all([
          this.api.apiGet<DimensionScoreRow[]>(`/api/dimension-scores?studentId=${studentId}&reviewId=${reviewId}`),
          this.api.apiGet<AskedQuestionRow[]>(`/api/asked-questions?studentId=${studentId}&reviewId=${reviewId}`),
        ])
          .then(([scores, questions]) => {
            if (cancelled) return;
            this.dimensionScores.set(scores ?? []);
            this.askedQuestions.set(questions ?? []);
          })
          .finally(() => {
            if (!cancelled) this.loading.set(false);
          });
      },
      { allowSignalWrites: true }
    );
  }

  scoreForDimension(dimensionId: string): number | undefined {
    return this.dimensionScores().find((s) => s.dimension_id === dimensionId)?.score;
  }

  private computeLocalDelta(scores: DimensionScoreRow[]): number | null {
    if (scores.length === 0) return null;
    const scoredIds = new Set(scores.map((s) => s.dimension_id));
    const relevant = this.dimensions().filter((d) => scoredIds.has(d.id));
    const totalWeight = relevant.reduce((sum, d) => sum + d.weightPercent, 0) || 1;
    const weightedAvg = relevant.reduce((sum, d) => {
      const s = scores.find((sc) => sc.dimension_id === d.id)!;
      return sum + (d.weightPercent / totalWeight) * s.score;
    }, 0);
    return Math.round((weightedAvg - 3) * 100) / 100;
  }

  async setDimensionScore(dimensionId: string, band: GradeBand) {
    const value = GRADE_BAND_VALUE[band];
    const current = this.scoreForDimension(dimensionId);
    const nextScore = current === value ? null : value;

    const withoutThis = this.dimensionScores().filter((s) => s.dimension_id !== dimensionId);
    const optimistic = nextScore === null
      ? withoutThis
      : [
          ...withoutThis,
          {
            id: `${this.studentId()}:${this.reviewId()}:${dimensionId}`,
            student_id: this.studentId(),
            review_id: this.reviewId(),
            dimension_id: dimensionId,
            score: nextScore,
            updated_at: new Date().toISOString(),
          },
        ];
    this.dimensionScores.set(optimistic);
    this.deltaChange.emit(this.computeLocalDelta(optimistic));

    const result = await this.api.apiWrite<{ delta: number | null; scores: DimensionScoreRow[] }>(
      'PUT',
      '/api/dimension-scores',
      { studentId: this.studentId(), reviewId: this.reviewId(), dimensionId, score: nextScore },
      `dim-${this.studentId()}-${this.reviewId()}-${dimensionId}`
    );
    if (Array.isArray(result?.scores)) {
      this.dimensionScores.set(result.scores);
      this.deltaChange.emit(result.delta);
    }
  }

  async addQuestion() {
    const text = this.newQuestionText().trim();
    if (!text) return;
    const studentId = this.studentId();
    const reviewId = this.reviewId();
    const optimisticId = `pending-${Date.now()}`;
    const now = new Date().toISOString();
    this.askedQuestions.set([
      ...this.askedQuestions(),
      {
        id: optimisticId,
        student_id: studentId,
        review_id: reviewId,
        text,
        rating: null,
        order_index: this.askedQuestions().length,
        created_at: now,
        updated_at: now,
      },
    ]);
    this.newQuestionText.set('');
    const saved = await this.api.apiWrite<AskedQuestionRow>('POST', '/api/asked-questions', {
      studentId,
      reviewId,
      text,
    });
    if (saved?.id && saved.id !== optimisticId) {
      this.askedQuestions.set(this.askedQuestions().map((q) => (q.id === optimisticId ? saved : q)));
    }
  }

  async rateQuestion(id: string, band: GradeBand) {
    const current = this.askedQuestions().find((q) => q.id === id)?.rating;
    const nextRating = current === band ? null : band;
    this.askedQuestions.set(this.askedQuestions().map((q) => (q.id === id ? { ...q, rating: nextRating } : q)));
    await this.api.apiWrite('PUT', `/api/asked-questions/${id}`, { rating: nextRating });
  }

  async removeQuestion(id: string) {
    this.askedQuestions.set(this.askedQuestions().filter((q) => q.id !== id));
    await this.api.apiWrite('DELETE', `/api/asked-questions/${id}`);
  }
}
