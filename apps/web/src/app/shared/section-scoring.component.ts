import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { ApiClientService } from '../core/services/api-client.service';
import type {
  GradeBand,
  ReviewDef,
  ReviewSectionDef,
  SectionScoreRow,
  SubtopicDef,
  SubtopicScoreRow,
} from '../core/models/types';
import { GRADE_BAND_LABEL, GRADE_BAND_VALUE } from '../core/models/types';
import { ButtonComponent } from '../ui/button.component';
import { BadgeComponent } from '../ui/badge.component';
import { InputDirective } from '../ui/input.directive';

type SectionWithSubtopics = ReviewSectionDef & { subtopics: SubtopicDef[] };
type ReviewWithSections = ReviewDef & { sections: SectionWithSubtopics[] };

const BANDS: GradeBand[] = ['below', 'partial', 'meets', 'exceeds'];
const POLL_INTERVAL_MS = 7000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Team-level scoring for one review: every section (technical/non-technical)
 * broken into reviewer-addable subtopics, each rated on the 4-band scale.
 * A section's score is the average band across its rated subtopics, scaled
 * to the section's max marks - see computeSectionScores server-side, which
 * this mirrors for instant optimistic feedback. Self-fetches both the
 * section/subtopic structure and the rating entries (and polls both) so it
 * stays in sync as other reviewers on the panel add subtopics or rate them.
 */
@Component({
  selector: 'app-section-scoring',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent, InputDirective],
  templateUrl: './section-scoring.component.html',
})
export class SectionScoringComponent {
  private api = inject(ApiClientService);

  teamId = input.required<string>();
  reviewId = input.required<string>();
  currentReviewerId = input.required<string | null>();
  /** Bump this (e.g. after a team reset) to force an immediate refetch even
   * though teamId/reviewId haven't changed. */
  resetNonce = input(0);
  sectionScoresChange = output<SectionScoreRow[]>();

  readonly BANDS = BANDS;
  readonly GRADE_BAND_LABEL = GRADE_BAND_LABEL;
  readonly GRADE_BAND_VALUE = GRADE_BAND_VALUE;

  loading = signal(true);
  sections = signal<SectionWithSubtopics[]>([]);
  entries = signal<SubtopicScoreRow[]>([]);
  newSubtopicText = signal<Record<string, string>>({});

  technicalSections = computed(() => this.sections().filter((s) => s.category === 'technical'));
  nonTechnicalSections = computed(() => this.sections().filter((s) => s.category === 'non_technical'));

  constructor() {
    effect(
      (onCleanup) => {
        const teamId = this.teamId();
        const reviewId = this.reviewId();
        this.resetNonce();
        let cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });
        this.loading.set(true);
        this.fetchAll(teamId, reviewId).finally(() => {
          if (!cancelled) this.loading.set(false);
        });
      },
      { allowSignalWrites: true }
    );

    // Panels typically have 2-3 reviewers scoring at once - a short poll
    // keeps subtopics and ratings visible to everyone without a full reload.
    const poll = setInterval(() => {
      this.fetchAll(this.teamId(), this.reviewId());
    }, POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(poll));
  }

  private async fetchAll(teamId: string, reviewId: string) {
    const [reviews, entries] = await Promise.all([
      this.api.apiGet<ReviewWithSections[]>('/api/reviews'),
      this.api.apiGet<SubtopicScoreRow[]>(`/api/subtopic-scores?teamId=${teamId}&reviewId=${reviewId}`),
    ]);
    if (teamId !== this.teamId() || reviewId !== this.reviewId()) return;
    const review = (reviews ?? []).find((r) => r.id === reviewId);
    this.sections.set(review?.sections ?? []);
    this.entries.set(entries ?? []);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), this.entries()));
  }

  private computeSectionScores(sections: SectionWithSubtopics[], entries: SubtopicScoreRow[]): SectionScoreRow[] {
    return sections.map((section) => {
      const avgBySubtopic = new Map<string, number>();
      for (const sub of section.subtopics) {
        const subEntries = entries.filter((e) => e.subtopic_id === sub.id);
        if (subEntries.length > 0) {
          avgBySubtopic.set(sub.id, subEntries.reduce((sum, e) => sum + GRADE_BAND_VALUE[e.band], 0) / subEntries.length);
        }
      }
      const ratedSubtopics = avgBySubtopic.size;
      let score: number | null = null;
      if (ratedSubtopics > 0) {
        const avgOfAvgs = Array.from(avgBySubtopic.values()).reduce((a, b) => a + b, 0) / ratedSubtopics;
        score = round2(section.maxMarks * (avgOfAvgs / 4));
      }
      return {
        sectionId: section.id,
        teamId: this.teamId(),
        reviewId: this.reviewId(),
        score,
        maxMarks: section.maxMarks,
        ratedSubtopics,
        totalSubtopics: section.subtopics.length,
      } satisfies SectionScoreRow;
    });
  }

  sectionScore(sectionId: string): SectionScoreRow | undefined {
    return this.computeSectionScores(this.sections(), this.entries()).find((s) => s.sectionId === sectionId);
  }

  avgBandForSubtopic(subtopicId: string): { avg: number; count: number } | null {
    const subEntries = this.entries().filter((e) => e.subtopic_id === subtopicId);
    if (subEntries.length === 0) return null;
    return {
      avg: round2(subEntries.reduce((sum, e) => sum + GRADE_BAND_VALUE[e.band], 0) / subEntries.length),
      count: subEntries.length,
    };
  }

  myBandForSubtopic(subtopicId: string): GradeBand | undefined {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return undefined;
    return this.entries().find((e) => e.subtopic_id === subtopicId && e.reviewer_id === reviewerId)?.band;
  }

  async setSubtopicBand(subtopicId: string, band: GradeBand) {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return;
    const current = this.myBandForSubtopic(subtopicId);
    const nextBand: GradeBand | null = current === band ? null : band;

    const withoutMine = this.entries().filter((e) => !(e.subtopic_id === subtopicId && e.reviewer_id === reviewerId));
    const optimistic = nextBand === null
      ? withoutMine
      : [
          ...withoutMine,
          {
            id: `${subtopicId}:${this.teamId()}:${reviewerId}`,
            subtopic_id: subtopicId,
            team_id: this.teamId(),
            reviewer_id: reviewerId,
            band: nextBand,
            updated_at: new Date().toISOString(),
          },
        ];
    this.entries.set(optimistic);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), optimistic));

    const result = await this.api.apiWrite<{ entries: SubtopicScoreRow[]; sectionScore: SectionScoreRow }>(
      'PUT',
      '/api/subtopic-scores',
      { subtopicId, teamId: this.teamId(), reviewerId, band: nextBand },
      `subtopic-${subtopicId}-${this.teamId()}-${reviewerId}`
    );
    if (result?.entries) {
      this.entries.set(result.entries);
      this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), result.entries));
    }
  }

  subtopicDraft(sectionId: string): string {
    return this.newSubtopicText()[sectionId] ?? '';
  }

  setSubtopicDraft(sectionId: string, value: string) {
    this.newSubtopicText.set({ ...this.newSubtopicText(), [sectionId]: value });
  }

  async addSubtopic(sectionId: string) {
    const label = this.subtopicDraft(sectionId).trim();
    if (!label) return;
    this.setSubtopicDraft(sectionId, '');
    const subtopic = await this.api.apiWrite<SubtopicDef>('POST', '/api/subtopics', { sectionId, label });
    if (subtopic?.id) {
      this.sections.set(
        this.sections().map((s) => (s.id === sectionId ? { ...s, subtopics: [...s.subtopics, subtopic] } : s))
      );
    }
  }

  async removeSubtopic(sectionId: string, subtopicId: string) {
    this.sections.set(
      this.sections().map((s) =>
        s.id === sectionId ? { ...s, subtopics: s.subtopics.filter((sub) => sub.id !== subtopicId) } : s
      )
    );
    this.entries.set(this.entries().filter((e) => e.subtopic_id !== subtopicId));
    await this.api.apiWrite('DELETE', `/api/subtopics/${subtopicId}`);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), this.entries()));
  }
}
