import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlayCircle, LucideRotateCcw } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { RoleService } from '../../core/services/role.service';
import { ToastService } from '../../ui/toast.service';
import type {
  ClassData,
  ReviewDef,
  ReviewSectionDef,
  ReviewerRow,
  ReviewReviewerRow,
  SectionScoreRow,
} from '../../core/models/types';
import { getStoredReviewerId, setStoredReviewerId } from '../../core/reviewer-session';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { SelectDirective } from '../../ui/select.directive';
import { SectionScoringComponent } from '../../shared/section-scoring.component';
import { WeakTopicsComponent } from '../../shared/weak-topics.component';

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

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
    SectionScoringComponent,
    WeakTopicsComponent,
    LucidePlayCircle,
    LucideRotateCcw,
  ],
  templateUrl: './score.component.html',
})
export class ScoreComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);
  role = inject(RoleService);

  classId = input.required<string>();

  classData = signal<ClassData | null>(null);
  reviews = signal<ReviewWithSections[]>([]);
  reviewers = signal<ReviewerRow[]>([]);
  /** Which reviews an admin has assigned the current reviewer to, for this
   * class - drives which review tabs a 'reviewer'-role user sees. Admins
   * always see every review regardless of assignment. */
  myAssignedReviewIds = signal<Set<string>>(new Set());
  reviewId = signal<string>('r1');
  teamId = signal<string | null>(null);
  resetNonce = signal(0);
  currentReviewerId = signal<string | null>(null);
  currentSectionScores = signal<SectionScoreRow[]>([]);

  visibleReviews = computed(() =>
    this.role.role() === 'reviewer'
      ? this.reviews().filter((r) => this.myAssignedReviewIds().has(r.id))
      : this.reviews()
  );

  review = computed(() => this.reviews().find((r) => r.id === this.reviewId()));
  team = computed(() => this.classData()?.teams.find((t) => t.id === this.teamId()) ?? null);
  rosterNames = computed(() => {
    const team = this.team();
    return team && team.students.length > 0 ? team.students.map((s) => s.name).join(', ') : '—';
  });

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

  constructor() {
    effect(
      () => {
        const classId = this.classId();
        this.currentReviewerId.set(getStoredReviewerId());
        this.api.apiGet<ClassData>(`/api/classes/${classId}`).then((data) => {
          if (data) {
            this.classData.set(data);
            if (!this.teamId()) this.teamId.set(data.teams[0]?.id ?? null);
          }
        });
        this.api.apiGet<ReviewWithSections[]>('/api/reviews').then((r) => this.reviews.set(r ?? []));
        this.api.apiGet<ReviewerRow[]>('/api/reviewers').then((r) => this.reviewers.set(r ?? []));
        this.refreshAssignments(classId, this.currentReviewerId());
      },
      { allowSignalWrites: true }
    );

    // Reviewers only ever see their assigned reviews - if the currently
    // selected tab isn't one of them (e.g. the default 'r1'), jump to the
    // first one that is.
    effect(
      () => {
        const visible = this.visibleReviews();
        if (this.role.role() === 'reviewer' && visible.length > 0 && !visible.some((r) => r.id === this.reviewId())) {
          this.reviewId.set(visible[0].id);
        }
      },
      { allowSignalWrites: true }
    );
  }

  private async refreshAssignments(classId: string, reviewerId: string | null) {
    if (!reviewerId) {
      this.myAssignedReviewIds.set(new Set());
      return;
    }
    const rows = await this.api.apiGet<ReviewReviewerRow[]>(`/api/review-reviewers?classId=${classId}`);
    this.myAssignedReviewIds.set(new Set((rows ?? []).filter((r) => r.reviewer_id === reviewerId).map((r) => r.review_id)));
  }

  selectReview(id: string) {
    this.reviewId.set(id);
  }

  selectTeam(id: string) {
    this.teamId.set(id);
  }

  selectReviewer(id: string | null) {
    setStoredReviewerId(id);
    this.currentReviewerId.set(id);
    this.refreshAssignments(this.classId(), id);
  }

  onSectionScoresChange(scores: SectionScoreRow[]) {
    this.currentSectionScores.set(scores);
  }

  async resetTeam() {
    const team = this.team();
    if (!team) return;
    if (!window.confirm(`Reset all scores and session state for ${team.name}? This can't be undone.`)) {
      return;
    }
    await this.api.apiWrite('DELETE', `/api/teams/${team.id}/reset`);
    this.currentSectionScores.set([]);
    this.resetNonce.set(this.resetNonce() + 1);
    this.toast.success(`${team.name} reset`);
  }
}
