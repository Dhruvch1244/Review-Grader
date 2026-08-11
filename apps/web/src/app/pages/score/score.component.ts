import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlayCircle, LucideRotateCcw } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  TeamScoreEntryRow,
  IndividualScoreRow,
  DimensionDef,
} from '../../core/models/types';
import { getStoredReviewerId, setStoredReviewerId } from '../../core/reviewer-session';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { SelectDirective } from '../../ui/select.directive';
import { IndividualAssessmentComponent } from '../../shared/individual-assessment.component';

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CardTitleComponent,
    BadgeComponent,
    SelectDirective,
    IndividualAssessmentComponent,
    LucidePlayCircle,
    LucideRotateCcw,
  ],
  templateUrl: './score.component.html',
})
export class ScoreComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  classId = input.required<string>();

  classData = signal<ClassData | null>(null);
  reviews = signal<ReviewWithCriteria[]>([]);
  teamScores = signal<Record<string, TeamScoreRow>>({});
  individualScores = signal<Record<string, IndividualScoreRow>>({});
  reviewId = signal<string>('r1');
  teamId = signal<string | null>(null);
  resetNonce = signal(0);
  dimensions = signal<DimensionDef[]>([]);
  teamScoreEntries = signal<TeamScoreEntryRow[]>([]);
  currentReviewerId = signal<string | null>(null);

  readonly scoreOptions = [1, 2, 3, 4, 5];
  readonly deltaOptions = [-2, -1, 0, 1, 2];

  review = computed(() => this.reviews().find((r) => r.id === this.reviewId()));
  team = computed(() => this.classData()?.teams.find((t) => t.id === this.teamId()) ?? null);

  teamAvg = computed(() => {
    const team = this.team();
    const review = this.review();
    if (!team || !review) return null;
    const scores = this.teamScores();
    const vals = review.criteria
      .map((c) => scores[`${team.id}:${review.id}:${c.id}`]?.score)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  });

  /** Team scores for the current team+review, keyed by criterion id - the
   * shape app-individual-assessment needs for its strengths/weaknesses panel. */
  teamScoresByCriterion = computed(() => {
    const team = this.team();
    const review = this.review();
    if (!team || !review) return {};
    const scores = this.teamScores();
    return Object.fromEntries(
      review.criteria.map((c) => [c.id, scores[`${team.id}:${review.id}:${c.id}`]])
    );
  });

  constructor() {
    this.api.apiGet<DimensionDef[]>('/api/dimensions').then((d) => this.dimensions.set(d ?? []));

    effect(
      () => {
        const classId = this.classId();
        this.currentReviewerId.set(getStoredReviewerId(classId));
        this.api.apiGet<ClassData>(`/api/classes/${classId}`).then((data) => {
          if (data) {
            this.classData.set(data);
            if (!this.teamId()) this.teamId.set(data.teams[0]?.id ?? null);
          }
        });
        this.api.apiGet<ReviewWithCriteria[]>('/api/reviews').then((r) => this.reviews.set(r ?? []));
        this.api
          .apiGet<{ teamScores: TeamScoreRow[]; individualScores: IndividualScoreRow[] }>(
            `/api/scores?classId=${classId}`
          )
          .then((data) => {
            if (!data) return;
            this.teamScores.set(Object.fromEntries(data.teamScores.map((s) => [s.id, s])));
            this.individualScores.set(Object.fromEntries(data.individualScores.map((s) => [s.id, s])));
          });
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const teamId = this.teamId();
        const reviewId = this.reviewId();
        if (!teamId) {
          this.teamScoreEntries.set([]);
          return;
        }
        this.api
          .apiGet<TeamScoreEntryRow[]>(`/api/scores/team-entries?teamId=${teamId}&reviewId=${reviewId}`)
          .then((entries) => this.teamScoreEntries.set(entries ?? []));
      },
      { allowSignalWrites: true }
    );
  }

  selectReview(id: string) {
    this.reviewId.set(id);
  }

  selectTeam(id: string) {
    this.teamId.set(id);
  }

  selectReviewer(id: string | null) {
    setStoredReviewerId(this.classId(), id);
    this.currentReviewerId.set(id);
  }

  /** This reviewer's own row for a criterion - drives button highlight + notes binding. */
  myEntryFor(criterionId: string): TeamScoreEntryRow | undefined {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return undefined;
    return this.teamScoreEntries().find((e) => e.criterion_id === criterionId && e.reviewer_id === reviewerId);
  }

  private recomputeAverage(teamId: string, reviewId: string, criterionId: string, entries: TeamScoreEntryRow[]) {
    const key = this.teamScoreKey(teamId, reviewId, criterionId);
    const mine = entries.filter((e) => e.criterion_id === criterionId && typeof e.score === 'number');
    const notesEntry = entries.find((e) => e.criterion_id === criterionId && e.notes);
    if (mine.length === 0) {
      const { [key]: _removed, ...rest } = this.teamScores();
      this.teamScores.set(rest);
      return;
    }
    const avg = Math.round((mine.reduce((sum, e) => sum + (e.score ?? 0), 0) / mine.length) * 100) / 100;
    this.teamScores.set({
      ...this.teamScores(),
      [key]: {
        id: key,
        team_id: teamId,
        review_id: reviewId,
        criterion_id: criterionId,
        score: avg,
        notes: notesEntry?.notes ?? null,
        updated_at: new Date().toISOString(),
        raterCount: mine.length,
      },
    });
  }

  teamScoreKey(teamId: string, reviewId: string, criterionId: string) {
    return `${teamId}:${reviewId}:${criterionId}`;
  }

  teamScoreFor(teamId: string, reviewId: string, criterionId: string) {
    return this.teamScores()[this.teamScoreKey(teamId, reviewId, criterionId)];
  }

  individualScoreFor(studentId: string, reviewId: string) {
    return this.individualScores()[`${studentId}:${reviewId}`];
  }

  finalScoreFor(studentId: string, reviewId: string) {
    const teamAvg = this.teamAvg();
    const delta = this.individualScoreFor(studentId, reviewId)?.delta;
    if (teamAvg !== null && typeof delta === 'number') {
      return Math.round((teamAvg + delta) * 100) / 100;
    }
    return teamAvg;
  }

  async setCriterionScore(criterionId: string, score: number) {
    const team = this.team();
    const review = this.review();
    const reviewerId = this.currentReviewerId();
    if (!team || !review || !reviewerId) return;
    const key = `${team.id}:${review.id}:${criterionId}:${reviewerId}`;
    const existingNotes = this.myEntryFor(criterionId)?.notes ?? null;
    const withoutMine = this.teamScoreEntries().filter(
      (e) => !(e.criterion_id === criterionId && e.reviewer_id === reviewerId)
    );
    const optimistic = [
      ...withoutMine,
      {
        id: key,
        team_id: team.id,
        review_id: review.id,
        criterion_id: criterionId,
        reviewer_id: reviewerId,
        score,
        notes: existingNotes,
        updated_at: new Date().toISOString(),
      },
    ];
    this.teamScoreEntries.set(optimistic);
    this.recomputeAverage(team.id, review.id, criterionId, optimistic);
    await this.api.apiWrite(
      'PUT',
      '/api/scores/team',
      { teamId: team.id, reviewId: review.id, criterionId, reviewerId, score, notes: existingNotes },
      `team-score-${key}`
    );
  }

  async setCriterionNotes(criterionId: string, notes: string) {
    const team = this.team();
    const review = this.review();
    const reviewerId = this.currentReviewerId();
    if (!team || !review || !reviewerId) return;
    const key = `${team.id}:${review.id}:${criterionId}:${reviewerId}`;
    const existingScore = this.myEntryFor(criterionId)?.score ?? null;
    const withoutMine = this.teamScoreEntries().filter(
      (e) => !(e.criterion_id === criterionId && e.reviewer_id === reviewerId)
    );
    const optimistic = [
      ...withoutMine,
      {
        id: key,
        team_id: team.id,
        review_id: review.id,
        criterion_id: criterionId,
        reviewer_id: reviewerId,
        score: existingScore,
        notes,
        updated_at: new Date().toISOString(),
      },
    ];
    this.teamScoreEntries.set(optimistic);
    this.recomputeAverage(team.id, review.id, criterionId, optimistic);
    await this.api.apiWrite(
      'PUT',
      '/api/scores/team',
      { teamId: team.id, reviewId: review.id, criterionId, reviewerId, score: existingScore, notes },
      `team-score-${key}`
    );
  }

  async setDelta(studentId: string, delta: number) {
    const review = this.review();
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    const existingNotes = this.individualScores()[key]?.notes ?? null;
    this.individualScores.set({
      ...this.individualScores(),
      [key]: {
        id: key,
        student_id: studentId,
        review_id: review.id,
        delta,
        notes: existingNotes,
        updated_at: new Date().toISOString(),
      },
    });
    await this.api.apiWrite(
      'PUT',
      '/api/scores/individual',
      { studentId, reviewId: review.id, delta, notes: existingNotes },
      `ind-score-${key}`
    );
  }

  /** Syncs local state after the question-ratings endpoint has already persisted the delta server-side. */
  setDeltaLocal(studentId: string, delta: number | null) {
    const review = this.review();
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    this.individualScores.set({
      ...this.individualScores(),
      [key]: {
        id: key,
        student_id: studentId,
        review_id: review.id,
        delta,
        notes: this.individualScores()[key]?.notes ?? null,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async setIndividualNotes(studentId: string, notes: string) {
    const review = this.review();
    if (!review) return;
    const key = `${studentId}:${review.id}`;
    const existingDelta = this.individualScores()[key]?.delta ?? null;
    this.individualScores.set({
      ...this.individualScores(),
      [key]: {
        id: key,
        student_id: studentId,
        review_id: review.id,
        delta: existingDelta,
        notes,
        updated_at: new Date().toISOString(),
      },
    });
    await this.api.apiWrite(
      'PUT',
      '/api/scores/individual',
      { studentId, reviewId: review.id, delta: existingDelta, notes },
      `ind-score-${key}`
    );
  }

  async resetTeam() {
    const team = this.team();
    if (!team) return;
    if (!window.confirm(`Reset all scores, ratings, and session state for ${team.name}? This can't be undone.`)) {
      return;
    }
    await this.api.apiWrite('DELETE', `/api/teams/${team.id}/reset`);
    const studentIds = new Set(team.students.map((s) => s.id));
    this.teamScores.set(
      Object.fromEntries(Object.entries(this.teamScores()).filter(([, v]) => v.team_id !== team.id))
    );
    this.individualScores.set(
      Object.fromEntries(Object.entries(this.individualScores()).filter(([, v]) => !studentIds.has(v.student_id)))
    );
    this.resetNonce.set(this.resetNonce() + 1);
    this.toast.success(`${team.name} reset`);
  }
}
