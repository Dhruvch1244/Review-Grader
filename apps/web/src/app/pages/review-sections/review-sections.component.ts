import { Component, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type { ReviewDef, ReviewSectionDef, SubtopicDef } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';

type ReviewWithSections = ReviewDef & { sections: (ReviewSectionDef & { subtopics: SubtopicDef[] })[] };

@Component({
  selector: 'app-review-sections',
  standalone: true,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, BadgeComponent, ButtonComponent, InputDirective],
  templateUrl: './review-sections.component.html',
})
export class ReviewSectionsComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  reviews = signal<ReviewWithSections[]>([]);
  saving = signal(false);

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await this.api.apiGet<ReviewWithSections[]>('/api/reviews');
    this.reviews.set(data ?? []);
  }

  reviewMax(review: ReviewWithSections): number {
    return Math.round(review.sections.reduce((sum, s) => sum + s.maxMarks, 0) * 100) / 100;
  }

  setLabel(reviewId: string, sectionId: string, label: string) {
    this.reviews.set(
      this.reviews().map((r) =>
        r.id !== reviewId ? r : { ...r, sections: r.sections.map((s) => (s.id === sectionId ? { ...s, label } : s)) }
      )
    );
  }

  setMarks(reviewId: string, sectionId: string, value: string) {
    const maxMarks = Number(value);
    if (Number.isNaN(maxMarks)) return;
    this.reviews.set(
      this.reviews().map((r) =>
        r.id !== reviewId ? r : { ...r, sections: r.sections.map((s) => (s.id === sectionId ? { ...s, maxMarks } : s)) }
      )
    );
  }

  async save() {
    this.saving.set(true);
    const sections = this.reviews().flatMap((r) => r.sections.map((s) => ({ id: s.id, label: s.label, maxMarks: s.maxMarks })));
    try {
      const updated = await this.api.apiWrite<ReviewWithSections[]>('PUT', '/api/reviews/sections', { sections });
      if (Array.isArray(updated)) this.reviews.set(updated);
      this.toast.success('Review sections saved');
    } finally {
      this.saving.set(false);
    }
  }
}
