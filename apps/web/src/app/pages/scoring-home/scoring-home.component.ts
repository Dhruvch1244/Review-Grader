import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBarChart3, LucideClipboardList } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { RoleService } from '../../core/services/role.service';
import { getStoredReviewerId, setStoredReviewerId } from '../../core/reviewer-session';
import type { ClassRow, ReviewDef, ReviewerRow, ReviewReviewerRow } from '../../core/models/types';
import { CardComponent, CardContentComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { SelectDirective } from '../../ui/select.directive';

/**
 * Landing page for scoring. Everyone picks "who's scoring" once here (or on
 * the Score page itself - same global identity either way). Admins always
 * see every class; reviewers see only the classes an admin has assigned
 * them to at least one review of, with badges for which reviews.
 */
@Component({
  selector: 'app-scoring-home',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    CardContentComponent,
    ButtonComponent,
    SelectDirective,
    LucideBarChart3,
    LucideClipboardList,
  ],
  templateUrl: './scoring-home.component.html',
})
export class ScoringHomeComponent {
  private api = inject(ApiClientService);
  role = inject(RoleService);

  classes = signal<ClassRow[]>([]);
  reviews = signal<ReviewDef[]>([]);
  reviewers = signal<ReviewerRow[]>([]);
  myAssignments = signal<ReviewReviewerRow[]>([]);
  currentReviewerId = signal<string | null>(getStoredReviewerId());

  visibleClasses = computed(() => {
    if (this.role.role() === 'admin') return this.classes();
    const assignedClassIds = new Set(this.myAssignments().map((a) => a.class_id));
    return this.classes().filter((c) => assignedClassIds.has(c.id));
  });

  constructor() {
    this.api.apiGet<ClassRow[]>('/api/classes').then((data) => this.classes.set(data ?? []));
    this.api.apiGet<ReviewDef[]>('/api/reviews').then((data) => this.reviews.set(data ?? []));
    this.api.apiGet<ReviewerRow[]>('/api/reviewers').then((data) => this.reviewers.set(data ?? []));
    this.refreshAssignments();
  }

  private async refreshAssignments() {
    const id = this.currentReviewerId();
    if (!id) {
      this.myAssignments.set([]);
      return;
    }
    const data = await this.api.apiGet<ReviewReviewerRow[]>(`/api/review-reviewers?reviewerId=${id}`);
    this.myAssignments.set(data ?? []);
  }

  selectReviewer(id: string | null) {
    setStoredReviewerId(id);
    this.currentReviewerId.set(id);
    this.refreshAssignments();
  }

  assignedReviewNumbers(classId: string): number[] {
    const reviewIds = new Set(this.myAssignments().filter((a) => a.class_id === classId).map((a) => a.review_id));
    return this.reviews()
      .filter((r) => reviewIds.has(r.id))
      .map((r) => r.number)
      .sort((a, b) => a - b);
  }
}
