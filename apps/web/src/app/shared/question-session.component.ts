import { Component, effect, inject, input, output, signal } from '@angular/core';
import { LucideChevronDown, LucideChevronRight } from '@lucide/angular';
import { ApiClientService } from '../core/services/api-client.service';
import type { GeneratedQuestion, QuestionRating, QuestionRatingRow } from '../core/models/types';
import { ButtonComponent } from '../ui/button.component';
import { BadgeComponent } from '../ui/badge.component';
import { CheckboxComponent } from '../ui/checkbox.component';
import { cn } from '../ui/utils';

const RATING_OPTIONS: { value: QuestionRating; label: string }[] = [
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'middle', label: 'Middle' },
  { value: 'answered', label: 'Answered' },
];

const RATING_DOT: Record<QuestionRating, string> = {
  unanswered: 'bg-destructive',
  middle: 'bg-amber-500',
  answered: 'bg-emerald-500',
};

@Component({
  selector: 'app-question-session',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent, CheckboxComponent, LucideChevronDown, LucideChevronRight],
  templateUrl: './question-session.component.html',
})
export class QuestionSessionComponent {
  private api = inject(ApiClientService);

  studentId = input.required<string>();
  teamId = input.required<string>();
  reviewId = input.required<string>();
  appendNotes = output<string>();
  deltaChange = output<number | null>();

  loading = signal(true);
  questions = signal<GeneratedQuestion[]>([]);
  ratings = signal<Record<string, QuestionRating>>({});
  openIds = signal<Set<string>>(new Set());

  readonly RATING_OPTIONS = RATING_OPTIONS;
  readonly cn = cn;
  readonly RATING_DOT = RATING_DOT;

  constructor() {
    // effect() (not ngOnInit) so this both runs once inputs are bound AND
    // re-fires if a parent ever rebinds a different student/team/review
    // into the same instance - mirrors the original's
    // useEffect(..., [studentId, teamId, reviewId]).
    effect((onCleanup) => {
      const studentId = this.studentId();
      const teamId = this.teamId();
      const reviewId = this.reviewId();
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      this.loading.set(true);
      this.api
        .apiGet<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
          `/api/question-sessions?studentId=${studentId}&teamId=${teamId}&reviewId=${reviewId}`
        )
        .then(async (data) => {
          if (cancelled) return;
          if (data?.questions?.length) {
            this.questions.set(data.questions);
            this.ratings.set(Object.fromEntries(data.ratings.map((r) => [r.criterion_id, r.rating])));
            return;
          }
          // No session yet for this student/review - generate one
          // immediately so the questions and weak spots are visible
          // without an extra click.
          const generated = await this.api.apiWrite<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
            'POST',
            '/api/question-sessions',
            { studentId, teamId, reviewId, regenerate: false }
          );
          if (cancelled) return;
          this.questions.set(generated.questions ?? []);
          this.ratings.set(Object.fromEntries((generated.ratings ?? []).map((r) => [r.criterion_id, r.rating])));
        })
        .finally(() => {
          if (!cancelled) this.loading.set(false);
        });
      // Angular disallows signal writes inside effect() by default (NG0600);
      // this effect intentionally writes loading/questions/ratings as it fetches.
    }, { allowSignalWrites: true });
  }

  toggleOpen(criterionId: string) {
    const next = new Set(this.openIds());
    if (next.has(criterionId)) next.delete(criterionId);
    else next.add(criterionId);
    this.openIds.set(next);
  }

  onKeydown(event: KeyboardEvent, criterionId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleOpen(criterionId);
    }
  }

  async regenerate() {
    this.loading.set(true);
    const data = await this.api.apiWrite<{ questions: GeneratedQuestion[]; ratings: QuestionRatingRow[] }>(
      'POST',
      '/api/question-sessions',
      { studentId: this.studentId(), teamId: this.teamId(), reviewId: this.reviewId(), regenerate: true }
    );
    this.questions.set(data.questions ?? []);
    this.ratings.set(Object.fromEntries((data.ratings ?? []).map((r) => [r.criterion_id, r.rating])));
    this.loading.set(false);
  }

  async setRating(criterionId: string, next: QuestionRating | null) {
    const copy = { ...this.ratings() };
    if (next) copy[criterionId] = next;
    else delete copy[criterionId];
    this.ratings.set(copy);

    const result = await this.api.apiWrite<{ delta: number | null }>(
      'PUT',
      '/api/question-ratings',
      { studentId: this.studentId(), reviewId: this.reviewId(), criterionId, rating: next },
      `rating-${this.studentId()}-${this.reviewId()}-${criterionId}`
    );
    this.deltaChange.emit(result.delta);
  }

  rate(criterionId: string, rating: QuestionRating) {
    const next = this.ratings()[criterionId] === rating ? null : rating;
    this.setRating(criterionId, next);
  }

  copyToNotes() {
    const summary = this.questions()
      .map((q, i) => `Q${i + 1} (${q.category}${q.weak ? ', weak spot' : ''}): ${q.question}`)
      .join('\n');
    this.appendNotes.emit(summary);
  }

  ratedCount() {
    return Object.keys(this.ratings()).length;
  }
}
