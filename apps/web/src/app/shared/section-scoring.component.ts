import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ApiClientService } from '../core/services/api-client.service';
import type {
  DirectScoreRow,
  GradeBand,
  ReviewDef,
  ReviewSectionDef,
  SectionScoreRow,
  StudentRow,
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
 * Team-level scoring for one review. Most sections break into pre-seeded
 * subtopics, each rated on the 4-band scale - a section's score is the
 * average band across its rated subtopics, scaled to the section's max
 * marks (see computeSectionScores server-side, which this mirrors for
 * instant optimistic feedback). Subtopics themselves are managed from the
 * admin Reviews page, not here - reviewers just rate what's already there.
 * A few sections (Component/Project Knowledge) skip subtopics entirely and
 * take a plain typed-in number instead. Self-fetches the section structure
 * and both kinds of rating entries (and polls both) so it stays in sync as
 * other panelists score alongside.
 */
@Component({
  selector: 'app-section-scoring',
  standalone: true,
  imports: [NgTemplateOutlet, ButtonComponent, BadgeComponent, InputDirective],
  templateUrl: './section-scoring.component.html',
})
export class SectionScoringComponent {
  private api = inject(ApiClientService);

  teamId = input.required<string>();
  reviewId = input.required<string>();
  currentReviewerId = input.required<string | null>();
  /** Individual-scope sections (e.g. Presentation) get one score per
   * student on this team instead of one shared team score. */
  students = input.required<StudentRow[]>();
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
  directEntries = signal<DirectScoreRow[]>([]);

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
    // keeps ratings visible to everyone without a full reload.
    const poll = setInterval(() => {
      this.fetchAll(this.teamId(), this.reviewId());
    }, POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(poll));
  }

  private async fetchAll(teamId: string, reviewId: string) {
    const [reviews, entries, directEntries] = await Promise.all([
      this.api.apiGet<ReviewWithSections[]>('/api/reviews'),
      this.api.apiGet<SubtopicScoreRow[]>(`/api/subtopic-scores?teamId=${teamId}&reviewId=${reviewId}`),
      this.api.apiGet<DirectScoreRow[]>(`/api/direct-scores?teamId=${teamId}&reviewId=${reviewId}`),
    ]);
    if (teamId !== this.teamId() || reviewId !== this.reviewId()) return;
    const review = (reviews ?? []).find((r) => r.id === reviewId);
    this.sections.set(review?.sections ?? []);
    this.entries.set(entries ?? []);
    this.directEntries.set(directEntries ?? []);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), this.entries(), this.directEntries()));
  }

  private computeSectionScores(
    sections: SectionWithSubtopics[],
    entries: SubtopicScoreRow[],
    directEntries: DirectScoreRow[]
  ): SectionScoreRow[] {
    const students = this.students();
    const scoreFor = (section: SectionWithSubtopics, studentId: string | null): SectionScoreRow => {
      if (section.scoreMode === 'direct') {
        const own = directEntries.filter((e) => e.section_id === section.id && e.student_id === studentId);
        const score =
          own.length > 0
            ? round2(Math.min(section.maxMarks, Math.max(0, own.reduce((sum, e) => sum + e.score, 0) / own.length)))
            : null;
        return {
          sectionId: section.id,
          teamId: this.teamId(),
          studentId,
          reviewId: this.reviewId(),
          score,
          maxMarks: section.maxMarks,
          ratedSubtopics: own.length,
          totalSubtopics: own.length,
        };
      }
      const avgBySubtopic = new Map<string, number>();
      for (const sub of section.subtopics) {
        const subEntries = entries.filter((e) => e.subtopic_id === sub.id && e.student_id === studentId);
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
        studentId,
        reviewId: this.reviewId(),
        score,
        maxMarks: section.maxMarks,
        ratedSubtopics,
        totalSubtopics: section.subtopics.length,
      };
    };
    return sections.flatMap((section) =>
      section.scope === 'team' ? [scoreFor(section, null)] : students.map((s) => scoreFor(section, s.id))
    );
  }

  sectionScore(sectionId: string, studentId: string | null = null): SectionScoreRow | undefined {
    return this.computeSectionScores(this.sections(), this.entries(), this.directEntries()).find(
      (s) => s.sectionId === sectionId && s.studentId === studentId
    );
  }

  avgBandForSubtopic(subtopicId: string, studentId: string | null = null): { avg: number; count: number } | null {
    const subEntries = this.entries().filter((e) => e.subtopic_id === subtopicId && e.student_id === studentId);
    if (subEntries.length === 0) return null;
    return {
      avg: round2(subEntries.reduce((sum, e) => sum + GRADE_BAND_VALUE[e.band], 0) / subEntries.length),
      count: subEntries.length,
    };
  }

  myBandForSubtopic(subtopicId: string, studentId: string | null = null): GradeBand | undefined {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return undefined;
    return this.entries().find(
      (e) => e.subtopic_id === subtopicId && e.reviewer_id === reviewerId && e.student_id === studentId
    )?.band;
  }

  async setSubtopicBand(subtopicId: string, band: GradeBand, studentId: string | null = null) {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return;
    const current = this.myBandForSubtopic(subtopicId, studentId);
    const nextBand: GradeBand | null = current === band ? null : band;

    const withoutMine = this.entries().filter(
      (e) => !(e.subtopic_id === subtopicId && e.reviewer_id === reviewerId && e.student_id === studentId)
    );
    const optimistic = nextBand === null
      ? withoutMine
      : [
          ...withoutMine,
          {
            id: `${subtopicId}:${this.teamId()}:${studentId ?? 'team'}:${reviewerId}`,
            subtopic_id: subtopicId,
            team_id: this.teamId(),
            student_id: studentId,
            reviewer_id: reviewerId,
            band: nextBand,
            updated_at: new Date().toISOString(),
          },
        ];
    this.entries.set(optimistic);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), optimistic, this.directEntries()));

    const result = await this.api.apiWrite<{ entries: SubtopicScoreRow[]; sectionScores: SectionScoreRow[] }>(
      'PUT',
      '/api/subtopic-scores',
      { subtopicId, teamId: this.teamId(), studentId, reviewerId, band: nextBand },
      `subtopic-${subtopicId}-${this.teamId()}-${studentId ?? 'team'}-${reviewerId}`
    );
    if (result?.entries) {
      this.entries.set(result.entries);
      this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), result.entries, this.directEntries()));
    }
  }

  /** This reviewer's own typed-in number for a 'direct' scoreMode section -
   * null if they haven't entered one. */
  myDirectScore(sectionId: string, studentId: string | null = null): number | null {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return null;
    return (
      this.directEntries().find(
        (e) => e.section_id === sectionId && e.reviewer_id === reviewerId && e.student_id === studentId
      )?.score ?? null
    );
  }

  async setDirectScore(sectionId: string, value: string, studentId: string | null = null) {
    const reviewerId = this.currentReviewerId();
    if (!reviewerId) return;
    const trimmed = value.trim();
    const score = trimmed === '' ? null : Number(trimmed);
    if (score !== null && Number.isNaN(score)) return;

    const withoutMine = this.directEntries().filter(
      (e) => !(e.section_id === sectionId && e.reviewer_id === reviewerId && e.student_id === studentId)
    );
    const optimistic = score === null
      ? withoutMine
      : [
          ...withoutMine,
          {
            id: `${sectionId}:${this.teamId()}:${studentId ?? 'team'}:${reviewerId}`,
            section_id: sectionId,
            team_id: this.teamId(),
            student_id: studentId,
            reviewer_id: reviewerId,
            score,
            updated_at: new Date().toISOString(),
          },
        ];
    this.directEntries.set(optimistic);
    this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), this.entries(), optimistic));

    const result = await this.api.apiWrite<{ entries: DirectScoreRow[]; sectionScores: SectionScoreRow[] }>(
      'PUT',
      '/api/direct-scores',
      { sectionId, teamId: this.teamId(), studentId, reviewerId, score },
      `direct-${sectionId}-${this.teamId()}-${studentId ?? 'team'}-${reviewerId}`
    );
    if (result?.entries) {
      this.directEntries.set(result.entries);
      this.sectionScoresChange.emit(this.computeSectionScores(this.sections(), this.entries(), result.entries));
    }
  }
}
