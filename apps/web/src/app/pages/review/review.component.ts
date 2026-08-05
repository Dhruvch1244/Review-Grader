import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  IndividualScoreRow,
  ReviewSessionRow,
} from '../../core/models/types';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ProgressComponent } from '../../ui/progress.component';
import { QuestionSessionComponent } from '../../shared/question-session.component';

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

const GRACE_OPTIONS = [-1, -0.5, 0, 0.5, 1];

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    BadgeComponent,
    ProgressComponent,
    QuestionSessionComponent,
  ],
  templateUrl: './review.component.html',
})
export class ReviewComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  classId = input.required<string>();
  reviewId = input.required<string>();
  teamId = input.required<string>();

  readonly GRACE_OPTIONS = GRACE_OPTIONS;
  readonly scoreOptions = [1, 2, 3, 4, 5];

  classData = signal<ClassData | null>(null);
  reviews = signal<ReviewWithCriteria[]>([]);
  teamScores = signal<Record<string, TeamScoreRow>>({});
  individualScores = signal<Record<string, IndividualScoreRow>>({});
  session = signal<ReviewSessionRow | null>(null);
  now = signal(Date.now());

  private autoAdvanced = false;

  team = computed(() => this.classData()?.teams.find((t) => t.id === this.teamId()) ?? null);
  review = computed(() => this.reviews().find((r) => r.id === this.reviewId()) ?? null);

  teamAvg = computed(() => {
    const team = this.team();
    const review = this.review();
    if (!team || !review) return null;
    const scores = this.teamScores();
    const vals = review.criteria
      .map((c) => scores[`${this.teamId()}:${this.reviewId()}:${c.id}`]?.score)
      .filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  });

  remainingSeconds = computed(() => {
    const session = this.session();
    if (!session) return 1200;
    if (!session.timer_started_at) return session.timer_duration_seconds;
    const elapsed = (this.now() - new Date(session.timer_started_at).getTime()) / 1000;
    return Math.max(0, Math.round(session.timer_duration_seconds - elapsed));
  });

  constructor() {
    effect(() => {
      const classId = this.classId();
      const reviewId = this.reviewId();
      const teamId = this.teamId();
      this.api.apiGet<ClassData>(`/api/classes/${classId}`).then((d) => {
        if (d) this.classData.set(d);
      });
      this.api.apiGet<ReviewWithCriteria[]>('/api/reviews').then((r) => this.reviews.set(r ?? []));
      this.api
        .apiGet<{ teamScores: TeamScoreRow[]; individualScores: IndividualScoreRow[] }>(`/api/scores?classId=${classId}`)
        .then((d) => {
          if (!d) return;
          this.teamScores.set(Object.fromEntries(d.teamScores.map((s) => [s.id, s])));
          this.individualScores.set(Object.fromEntries(d.individualScores.map((s) => [s.id, s])));
        });
      this.api
        .apiGet<ReviewSessionRow>(`/api/review-sessions?teamId=${teamId}&reviewId=${reviewId}`)
        .then((s) => {
          if (s) this.session.set(s);
        });
    });

    // 1s clock tick driving remainingSeconds(); plain signal write from a
    // timer callback, not from inside effect()/computed() tracked execution.
    setInterval(() => this.now.set(Date.now()), 1000);

    // Auto-advance-once guard: mirrors the original's autoAdvancedRef -
    // fires exactly one PATCH when the presentation clock hits zero, and
    // resets as soon as the phase moves off "presentation".
    effect(() => {
      const session = this.session();
      const remaining = this.remainingSeconds();
      if (session?.phase === 'presentation' && remaining <= 0 && !this.autoAdvanced) {
        this.autoAdvanced = true;
        this.toast.info("Presentation time's up - moving to individual Q&A");
        this.patchSession({ phase: 'individual', current_student_index: 0 });
      }
      if (session?.phase !== 'presentation') this.autoAdvanced = false;
    }, { allowSignalWrites: true });
  }

  async patchSession(patch: Partial<ReviewSessionRow>) {
    const updated = await this.api.apiWrite<ReviewSessionRow>('PATCH', '/api/review-sessions', {
      teamId: this.teamId(),
      reviewId: this.reviewId(),
      ...patch,
    });
    this.session.set(updated);
    return updated;
  }

  async startPresentation() {
    await this.patchSession({
      phase: 'presentation',
      timer_started_at: new Date().toISOString(),
      current_student_index: 0,
    });
    this.toast.success('Presentation started - 20:00 on the clock');
  }

  async setCriterionScore(criterionId: string, score: number) {
    const review = this.review();
    if (!review) return;
    const key = `${this.teamId()}:${this.reviewId()}:${criterionId}`;
    const existingNotes = this.teamScores()[key]?.notes ?? null;
    this.teamScores.set({
      ...this.teamScores(),
      [key]: {
        id: key,
        team_id: this.teamId(),
        review_id: this.reviewId(),
        criterion_id: criterionId,
        score,
        notes: existingNotes,
        updated_at: new Date().toISOString(),
      },
    });
    await this.api.apiWrite(
      'PUT',
      '/api/scores/team',
      { teamId: this.teamId(), reviewId: this.reviewId(), criterionId, score, notes: existingNotes },
      `team-score-${key}`
    );
  }

  studentKey(studentId: string) {
    return `${studentId}:${this.reviewId()}`;
  }

  async setGrace(studentId: string, grace: number) {
    const row = await this.api.apiWrite<IndividualScoreRow>(
      'PUT',
      '/api/scores/grace',
      { studentId, reviewId: this.reviewId(), grace },
      `grace-${studentId}`
    );
    const key = this.studentKey(studentId);
    this.individualScores.set({ ...this.individualScores(), [key]: { ...this.individualScores()[key], ...row } });
  }

  setDeltaLocal(studentId: string, delta: number | null) {
    const key = this.studentKey(studentId);
    this.individualScores.set({
      ...this.individualScores(),
      [key]: {
        id: key,
        student_id: studentId,
        review_id: this.reviewId(),
        delta,
        notes: this.individualScores()[key]?.notes ?? null,
        updated_at: new Date().toISOString(),
      },
    });
  }

  finalScoreFor(studentId: string): number | null {
    const teamAvg = this.teamAvg();
    const delta = this.individualScores()[this.studentKey(studentId)]?.delta;
    if (teamAvg !== null && typeof delta === 'number') {
      return Math.round((teamAvg + delta) * 100) / 100;
    }
    return teamAvg;
  }

  finalWithGraceFor(studentId: string): { delta: number; grace: number; final: number | null } {
    const ind = this.individualScores()[this.studentKey(studentId)];
    const delta = ind?.delta ?? 0;
    const grace = ind?.grace ?? 0;
    const teamAvg = this.teamAvg();
    const final = teamAvg !== null ? Math.round((teamAvg + delta + grace) * 100) / 100 : null;
    return { delta, grace, final };
  }

  timerColor(): string {
    const r = this.remainingSeconds();
    return r > 300 ? 'text-emerald-600' : r > 60 ? 'text-amber-600' : 'text-red-600';
  }

  mmss(): string {
    const r = this.remainingSeconds();
    const mm = Math.floor(r / 60).toString().padStart(2, '0');
    const ss = Math.floor(r % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  timerPct(): number {
    const session = this.session();
    if (!session) return 0;
    return Math.min(
      100,
      Math.max(0, ((session.timer_duration_seconds - this.remainingSeconds()) / session.timer_duration_seconds) * 100)
    );
  }

  async finishQA() {
    await this.patchSession({ phase: 'final' });
  }

  async markComplete() {
    await this.patchSession({ phase: 'done' });
    this.toast.success('Review marked complete');
  }

  async restartSession() {
    await this.patchSession({ phase: 'idle', timer_started_at: null, current_student_index: 0 });
  }

  async endPresentationNow() {
    await this.patchSession({ phase: 'individual', current_student_index: 0 });
  }
}
