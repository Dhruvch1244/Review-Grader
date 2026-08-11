import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { ApiClientService } from '../core/services/api-client.service';
import type {
  AskedQuestionRow,
  ClassReviewerRow,
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
const POLL_INTERVAL_MS = 7000;

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
  reviewers = input.required<ClassReviewerRow[]>();
  currentReviewerId = input.required<string | null>();
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
        this.fetchAll(studentId, reviewId).finally(() => {
          if (!cancelled) this.loading.set(false);
        });
      },
      { allowSignalWrites: true }
    );

    // Panels typically have 2-3 reviewers scoring at once (possibly on
    // separate devices) - a short poll keeps dimension scores and the
    // asked-questions log visible to everyone without a full reload.
    const poll = setInterval(() => {
      this.fetchAll(this.studentId(), this.reviewId());
    }, POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(poll));
  }

  private async fetchAll(studentId: string, reviewId: string) {
    const [scores, questions] = await Promise.all([
      this.api.apiGet<DimensionScoreRow[]>(`/api/dimension-scores?studentId=${studentId}&reviewId=${reviewId}`),
      this.api.apiGet<AskedQuestionRow[]>(`/api/asked-questions?studentId=${studentId}&reviewId=${reviewId}`),
    ]);
    if (studentId !== this.studentId() || reviewId !== this.reviewId()) return;
    this.dimensionScores.set(scores ?? []);
    this.askedQuestions.set(questions ?? []);
  }

  reviewerName(id: string | null): string {
    if (!id) return 'Unknown';
    return this.reviewers().find((r) => r.id === id)?.name ?? 'Unknown';
  }

  /** This reviewer's own grade for a dimension - drives the button highlight. */
  myScoreForDimension(dimensionId: string): number | undefined {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return undefined;
    return this.dimensionScores().find((s) => s.dimension_id === dimensionId && s.reviewer_id === reviewerId)?.score;
  }

  /** Cross-reviewer average for a dimension - shown as context alongside the buttons. */
  avgScoreForDimension(dimensionId: string): { avg: number; count: number } | null {
    const scores = this.dimensionScores().filter((s) => s.dimension_id === dimensionId);
    if (scores.length === 0) return null;
    return { avg: Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 100) / 100, count: scores.length };
  }

  private computeLocalDelta(scores: DimensionScoreRow[]): number | null {
    if (scores.length === 0) return null;
    const dimensions = this.dimensions();
    const avgByDimension = new Map<string, number>();
    for (const d of dimensions) {
      const dimScores = scores.filter((s) => s.dimension_id === d.id);
      if (dimScores.length > 0) {
        avgByDimension.set(d.id, dimScores.reduce((sum, s) => sum + s.score, 0) / dimScores.length);
      }
    }
    const relevant = dimensions.filter((d) => avgByDimension.has(d.id));
    const totalWeight = relevant.reduce((sum, d) => sum + d.weightPercent, 0) || 1;
    const weightedAvg = relevant.reduce((sum, d) => sum + (d.weightPercent / totalWeight) * avgByDimension.get(d.id)!, 0);
    return Math.round((weightedAvg - 3) * 100) / 100;
  }

  async setDimensionScore(dimensionId: string, band: GradeBand) {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return;
    const value = GRADE_BAND_VALUE[band];
    const current = this.myScoreForDimension(dimensionId);
    const nextScore = current === value ? null : value;

    const withoutMine = this.dimensionScores().filter(
      (s) => !(s.dimension_id === dimensionId && s.reviewer_id === reviewerId)
    );
    const optimistic =
      nextScore === null
        ? withoutMine
        : [
            ...withoutMine,
            {
              id: `${this.studentId()}:${this.reviewId()}:${dimensionId}:${reviewerId}`,
              student_id: this.studentId(),
              review_id: this.reviewId(),
              dimension_id: dimensionId,
              reviewer_id: reviewerId,
              score: nextScore,
              updated_at: new Date().toISOString(),
            },
          ];
    this.dimensionScores.set(optimistic);
    this.deltaChange.emit(this.computeLocalDelta(optimistic));

    const result = await this.api.apiWrite<{ delta: number | null; scores: DimensionScoreRow[] }>(
      'PUT',
      '/api/dimension-scores',
      { studentId: this.studentId(), reviewId: this.reviewId(), dimensionId, reviewerId, score: nextScore },
      `dim-${this.studentId()}-${this.reviewId()}-${dimensionId}-${reviewerId}`
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
    const reviewerId = this.currentReviewerId();
    const optimisticId = `pending-${Date.now()}`;
    const now = new Date().toISOString();
    this.askedQuestions.set([
      ...this.askedQuestions(),
      {
        id: optimisticId,
        student_id: studentId,
        review_id: reviewId,
        reviewer_id: reviewerId,
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
      reviewerId,
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
