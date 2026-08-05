import { Component, computed, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import type { QuestionBankCriterion } from '../../core/models/types';
import { TabsComponent, TabsListComponent, TabsTriggerComponent } from '../../ui/tabs.component';
import { CriterionEditorComponent } from './criterion-editor.component';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [TabsComponent, TabsListComponent, TabsTriggerComponent, CriterionEditorComponent],
  templateUrl: './questions.component.html',
})
export class QuestionsComponent {
  private api = inject(ApiClientService);

  bank = signal<QuestionBankCriterion[]>([]);
  reviewId = signal('r1');

  reviewIds = computed(() => Array.from(new Set(this.bank().map((c) => c.reviewId))));
  reviewLabels = computed(() => Object.fromEntries(this.bank().map((c) => [c.reviewId, c.reviewLabel])));
  criteriaForReview = computed(() => this.bank().filter((c) => c.reviewId === this.reviewId()));

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await this.api.apiGet<QuestionBankCriterion[]>('/api/question-bank');
    this.bank.set(data ?? []);
  }

  updateCriterionLocally(id: string, patch: Partial<QuestionBankCriterion>) {
    this.bank.update((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
}
