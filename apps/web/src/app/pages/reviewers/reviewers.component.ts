import { Component, inject, signal } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ReviewerRow } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';

@Component({
  selector: 'app-reviewers',
  standalone: true,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, ButtonComponent, InputDirective, LucidePlus, LucideTrash2],
  templateUrl: './reviewers.component.html',
})
export class ReviewersComponent {
  private api = inject(ApiClientService);

  reviewers = signal<ReviewerRow[]>([]);
  newName = signal('');

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await this.api.apiGet<ReviewerRow[]>('/api/reviewers');
    this.reviewers.set(data ?? []);
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
    await this.api.apiWrite('DELETE', `/api/reviewers/${id}`, undefined, `delete-reviewer-${id}`);
  }
}
