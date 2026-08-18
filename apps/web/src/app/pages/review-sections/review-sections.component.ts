import { Component, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type { ReviewDef, ReviewSectionDef, SectionCategory, SectionScope, SubtopicDef } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';
import { SelectDirective } from '../../ui/select.directive';

type ReviewWithSections = ReviewDef & { sections: (ReviewSectionDef & { subtopics: SubtopicDef[] })[] };

@Component({
  selector: 'app-review-sections',
  standalone: true,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    BadgeComponent,
    ButtonComponent,
    InputDirective,
    SelectDirective,
  ],
  templateUrl: './review-sections.component.html',
})
export class ReviewSectionsComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  reviews = signal<ReviewWithSections[]>([]);
  saving = signal(false);

  newSectionLabel = signal<Record<string, string>>({});
  newSectionMarks = signal<Record<string, string>>({});
  newSectionCategory = signal<Record<string, SectionCategory>>({});
  newSectionScope = signal<Record<string, SectionScope>>({});
  newSubtopicText = signal<Record<string, string>>({});

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

  newLabel(reviewId: string): string {
    return this.newSectionLabel()[reviewId] ?? '';
  }
  setNewLabel(reviewId: string, value: string) {
    this.newSectionLabel.set({ ...this.newSectionLabel(), [reviewId]: value });
  }
  newMarks(reviewId: string): string {
    return this.newSectionMarks()[reviewId] ?? '';
  }
  setNewMarks(reviewId: string, value: string) {
    this.newSectionMarks.set({ ...this.newSectionMarks(), [reviewId]: value });
  }
  newCategory(reviewId: string): SectionCategory {
    return this.newSectionCategory()[reviewId] ?? 'technical';
  }
  setNewCategory(reviewId: string, value: string) {
    this.newSectionCategory.set({ ...this.newSectionCategory(), [reviewId]: value as SectionCategory });
  }
  newScope(reviewId: string): SectionScope {
    return this.newSectionScope()[reviewId] ?? 'team';
  }
  setNewScope(reviewId: string, value: string) {
    this.newSectionScope.set({ ...this.newSectionScope(), [reviewId]: value as SectionScope });
  }

  async addSection(reviewId: string) {
    const label = this.newLabel(reviewId).trim();
    const maxMarks = Number(this.newMarks(reviewId));
    if (!label || Number.isNaN(maxMarks) || maxMarks <= 0) return;
    const category = this.newCategory(reviewId);
    const scope = this.newScope(reviewId);
    this.setNewLabel(reviewId, '');
    this.setNewMarks(reviewId, '');
    const updated = await this.api.apiWrite<ReviewWithSections[]>('POST', '/api/reviews/sections', {
      reviewId,
      label,
      category,
      scope,
      maxMarks,
    });
    if (Array.isArray(updated)) this.reviews.set(updated);
    this.toast.success(`Added "${label}"`);
  }

  async removeSection(sectionId: string, label: string) {
    if (!window.confirm(`Remove "${label}"? Any subtopics and ratings under it are removed too.`)) return;
    const updated = await this.api.apiWrite<ReviewWithSections[]>('DELETE', `/api/reviews/sections/${sectionId}`);
    if (Array.isArray(updated)) this.reviews.set(updated);
  }

  subtopicDraft(sectionId: string): string {
    return this.newSubtopicText()[sectionId] ?? '';
  }
  setSubtopicDraft(sectionId: string, value: string) {
    this.newSubtopicText.set({ ...this.newSubtopicText(), [sectionId]: value });
  }

  async addSubtopic(reviewId: string, sectionId: string) {
    const label = this.subtopicDraft(sectionId).trim();
    if (!label) return;
    this.setSubtopicDraft(sectionId, '');
    const subtopic = await this.api.apiWrite<SubtopicDef>('POST', '/api/subtopics', { sectionId, label });
    if (subtopic?.id) {
      this.reviews.set(
        this.reviews().map((r) =>
          r.id !== reviewId
            ? r
            : { ...r, sections: r.sections.map((s) => (s.id === sectionId ? { ...s, subtopics: [...s.subtopics, subtopic] } : s)) }
        )
      );
    }
  }

  async removeSubtopic(reviewId: string, sectionId: string, subtopicId: string) {
    this.reviews.set(
      this.reviews().map((r) =>
        r.id !== reviewId
          ? r
          : {
              ...r,
              sections: r.sections.map((s) =>
                s.id === sectionId ? { ...s, subtopics: s.subtopics.filter((sub) => sub.id !== subtopicId) } : s
              ),
            }
      )
    );
    await this.api.apiWrite('DELETE', `/api/subtopics/${subtopicId}`);
  }
}
