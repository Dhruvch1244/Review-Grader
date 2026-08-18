import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type {
  ClassData,
  ReviewDef,
  ReviewSectionDef,
  ReviewerRow,
  ReviewReviewerRow,
  ReviewSessionRow,
  SectionScoreRow,
} from '../../core/models/types';
import { getStoredReviewerId, setStoredReviewerId } from '../../core/reviewer-session';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ProgressComponent } from '../../ui/progress.component';
import { SelectDirective } from '../../ui/select.directive';
import { CheckboxComponent } from '../../ui/checkbox.component';
import { SectionScoringComponent } from '../../shared/section-scoring.component';
import { WeakTopicsComponent } from '../../shared/weak-topics.component';

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

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
    SelectDirective,
    CheckboxComponent,
    SectionScoringComponent,
    WeakTopicsComponent,
  ],
  templateUrl: './review.component.html',
})
export class ReviewComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  classId = input.required<string>();
  reviewId = input.required<string>();
  teamId = input.required<string>();

  classData = signal<ClassData | null>(null);
  reviews = signal<ReviewWithSections[]>([]);
  reviewers = signal<ReviewerRow[]>([]);
  session = signal<ReviewSessionRow | null>(null);
  now = signal(Date.now());
  currentReviewerId = signal<string | null>(null);
  isMyReview = signal(false);
  currentSectionScores = signal<SectionScoreRow[]>([]);

  private autoAdvanced = false;

  team = computed(() => this.classData()?.teams.find((t) => t.id === this.teamId()) ?? null);
  review = computed(() => this.reviews().find((r) => r.id === this.reviewId()) ?? null);

  /** One row per student on the team: team-scope sections contribute the
   * same value to everyone, individual-scope sections (e.g. Presentation)
   * contribute that student's own score - mirrors computeReviewTotal
   * server-side. */
  reviewTotals = computed(() => {
    const scores = this.currentSectionScores();
    const review = this.review();
    const team = this.team();
    if (!review || !team) return [];
    return team.students.map((student) => {
      let technicalEarned = 0;
      let technicalMax = 0;
      let nonTechnicalEarned = 0;
      let nonTechnicalMax = 0;
      for (const ss of scores) {
        if (ss.score === null) continue;
        const section = review.sections.find((s) => s.id === ss.sectionId);
        if (!section) continue;
        const appliesToStudent = section.scope === 'team' ? ss.studentId === null : ss.studentId === student.id;
        if (!appliesToStudent) continue;
        if (section.category === 'technical') {
          technicalEarned += ss.score;
          technicalMax += ss.maxMarks;
        } else {
          nonTechnicalEarned += ss.score;
          nonTechnicalMax += ss.maxMarks;
        }
      }
      return {
        studentId: student.id,
        studentName: student.name,
        technicalEarned: Math.round(technicalEarned * 100) / 100,
        technicalMax,
        nonTechnicalEarned: Math.round(nonTechnicalEarned * 100) / 100,
        nonTechnicalMax,
        totalEarned: Math.round((technicalEarned + nonTechnicalEarned) * 100) / 100,
        totalMax: technicalMax + nonTechnicalMax,
      };
    });
  });

  remainingSeconds = computed(() => {
    const session = this.session();
    if (!session) return 1200;
    if (!session.timer_started_at) return session.timer_duration_seconds;
    const elapsed = (this.now() - new Date(session.timer_started_at).getTime()) / 1000;
    return Math.max(0, Math.round(session.timer_duration_seconds - elapsed));
  });

  constructor() {
    effect(
      () => {
        const classId = this.classId();
        const reviewId = this.reviewId();
        const teamId = this.teamId();
        this.currentReviewerId.set(getStoredReviewerId(classId));
        this.api.apiGet<ClassData>(`/api/classes/${classId}`).then((d) => {
          if (d) this.classData.set(d);
        });
        this.api.apiGet<ReviewWithSections[]>('/api/reviews').then((r) => this.reviews.set(r ?? []));
        this.api.apiGet<ReviewerRow[]>('/api/reviewers').then((r) => this.reviewers.set(r ?? []));
        this.api
          .apiGet<ReviewSessionRow>(`/api/review-sessions?teamId=${teamId}&reviewId=${reviewId}`)
          .then((s) => {
            if (s) this.session.set(s);
          });
        this.refreshMembership(classId, reviewId, this.currentReviewerId());
      },
      { allowSignalWrites: true }
    );

    // 1s clock tick driving remainingSeconds(); plain signal write from a
    // timer callback, not from inside effect()/computed() tracked execution.
    setInterval(() => this.now.set(Date.now()), 1000);

    // Auto-advance-once guard: fires exactly one PATCH when the
    // presentation clock hits zero, and resets as soon as the phase moves
    // off "presentation".
    effect(() => {
      const session = this.session();
      const remaining = this.remainingSeconds();
      if (session?.phase === 'presentation' && remaining <= 0 && !this.autoAdvanced) {
        this.autoAdvanced = true;
        this.toast.info("Presentation time's up - moving to scoring");
        this.patchSession({ phase: 'scoring' });
      }
      if (session?.phase !== 'presentation') this.autoAdvanced = false;
    }, { allowSignalWrites: true });
  }

  private async refreshMembership(classId: string, reviewId: string, reviewerId: string | null) {
    if (!reviewerId) {
      this.isMyReview.set(false);
      return;
    }
    const rows = await this.api.apiGet<ReviewReviewerRow[]>(`/api/review-reviewers?classId=${classId}`);
    this.isMyReview.set((rows ?? []).some((r) => r.reviewer_id === reviewerId && r.review_id === reviewId));
  }

  selectReviewer(id: string | null) {
    setStoredReviewerId(this.classId(), id);
    this.currentReviewerId.set(id);
    this.refreshMembership(this.classId(), this.reviewId(), id);
  }

  async toggleMyReview(member: boolean) {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return;
    this.isMyReview.set(member);
    await this.api.apiWrite('PUT', '/api/review-reviewers', {
      classId: this.classId(),
      reviewId: this.reviewId(),
      reviewerId,
      member,
    });
  }

  onSectionScoresChange(scores: SectionScoreRow[]) {
    this.currentSectionScores.set(scores);
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
    await this.patchSession({ phase: 'presentation', timer_started_at: new Date().toISOString() });
    this.toast.success('Presentation started - 20:00 on the clock');
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

  async endPresentationNow() {
    await this.patchSession({ phase: 'scoring' });
  }

  async markComplete() {
    await this.patchSession({ phase: 'done' });
    this.toast.success('Review marked complete');
  }

  async restartSession() {
    await this.patchSession({ phase: 'idle', timer_started_at: null });
  }
}
