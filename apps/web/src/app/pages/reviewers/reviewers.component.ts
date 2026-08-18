import { Component, inject, signal } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ClassRow, ReviewDef, ReviewerRow, ReviewReviewerRow } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';
import { SelectDirective } from '../../ui/select.directive';

const SLOTS = [0, 1] as const;

@Component({
  selector: 'app-reviewers',
  standalone: true,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    ButtonComponent,
    InputDirective,
    SelectDirective,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './reviewers.component.html',
})
export class ReviewersComponent {
  private api = inject(ApiClientService);

  readonly SLOTS = SLOTS;

  reviewers = signal<ReviewerRow[]>([]);
  classes = signal<ClassRow[]>([]);
  reviews = signal<ReviewDef[]>([]);
  assignments = signal<ReviewReviewerRow[]>([]);
  newName = signal('');
  /** Gates the assignment matrix's first render until every signal it
   * reads has its real data - a <select>'s [value] binding only "sticks"
   * if a matching <option> already exists in the DOM at that moment, so
   * rendering it before reviewers()/classes()/reviews() all resolve (they
   * load via independent, unordered promises) can silently drop the
   * selection. */
  dataLoaded = signal(false);

  constructor() {
    Promise.all([
      this.refresh(),
      this.refreshAssignments(),
      this.api.apiGet<ClassRow[]>('/api/classes').then((data) => this.classes.set(data ?? [])),
      this.api.apiGet<ReviewDef[]>('/api/reviews').then((data) => this.reviews.set(data ?? [])),
    ]).then(() => this.dataLoaded.set(true));
  }

  async refresh() {
    const data = await this.api.apiGet<ReviewerRow[]>('/api/reviewers');
    this.reviewers.set(data ?? []);
  }

  async refreshAssignments() {
    const data = await this.api.apiGet<ReviewReviewerRow[]>('/api/review-reviewers');
    this.assignments.set(data ?? []);
  }

  async addReviewer() {
    const name = this.newName().trim();
    if (!name) return;
    this.newName.set('');
    const reviewer = await this.api.apiWrite<ReviewerRow>('POST', '/api/reviewers', { name });
    this.reviewers.set([...this.reviewers(), reviewer]);
  }

  renameLocally(id: string, name: string) {
    this.reviewers.set(this.reviewers().map((r) => (r.id === id ? { ...r, name } : r)));
  }

  async commitRename(id: string, name: string) {
    await this.api.apiWrite('PATCH', `/api/reviewers/${id}`, { name }, `rename-reviewer-${id}`);
  }

  async removeReviewer(id: string) {
    this.reviewers.set(this.reviewers().filter((r) => r.id !== id));
    this.assignments.set(this.assignments().filter((a) => a.reviewer_id !== id));
    await this.api.apiWrite('DELETE', `/api/reviewers/${id}`, undefined, `delete-reviewer-${id}`);
  }

  /** Panel assignment: exactly 2 reviewer slots per (class, review), admin
   * picked. assignedIds returns whoever's currently assigned (order is
   * arbitrary - just enough to render into the 2 slots below). */
  private assignedIds(classId: string, reviewId: string): string[] {
    return this.assignments()
      .filter((a) => a.class_id === classId && a.review_id === reviewId)
      .map((a) => a.reviewer_id);
  }

  slotValue(classId: string, reviewId: string, slot: number): string {
    return this.assignedIds(classId, reviewId)[slot] ?? '';
  }

  async setSlot(classId: string, reviewId: string, slot: number, reviewerId: string) {
    const current = this.assignedIds(classId, reviewId);
    const previous = current[slot] ?? null;
    const next = reviewerId || null;
    if (previous === next) return;
    if (previous && previous !== next) {
      await this.api.apiWrite('PUT', '/api/review-reviewers', { classId, reviewId, reviewerId: previous, member: false });
    }
    if (next) {
      await this.api.apiWrite('PUT', '/api/review-reviewers', { classId, reviewId, reviewerId: next, member: true });
    }
    await this.refreshAssignments();
  }
}
