import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type { QuestionBankCriterion, QuestionVariant } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';

@Component({
  selector: 'app-criterion-editor',
  standalone: true,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    BadgeComponent,
    ButtonComponent,
    InputDirective,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './criterion-editor.component.html',
})
export class CriterionEditorComponent implements OnInit {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  // A new component instance is created per criterion id (the parent's
  // @for tracks by c.id), so `criterion()` never changes identity within
  // one instance's lifetime - safe to seed the editable copy once, in
  // ngOnInit (required signal inputs throw NG0950 if read any earlier -
  // field initializers and even the constructor body run before Angular
  // has bound them).
  criterion = input.required<QuestionBankCriterion>();
  update = output<Partial<QuestionBankCriterion>>();

  guidance = signal('');
  newQuestion = signal('');

  badgeVariant = computed(() => (this.criterion().category === 'Security' ? 'secondary' : 'outline'));

  ngOnInit() {
    this.guidance.set(this.criterion().guidance ?? '');
  }

  async saveGuidance() {
    await this.api.apiWrite('PATCH', `/api/question-bank/guidance/${this.criterion().id}`, {
      guidance: this.guidance(),
    });
    this.update.emit({ guidance: this.guidance() });
  }

  async addQuestion() {
    const text = this.newQuestion().trim();
    if (!text) return;
    const variant = await this.api.apiWrite<QuestionVariant>('POST', '/api/question-bank/questions', {
      criterionId: this.criterion().id,
      text,
    });
    this.update.emit({ questions: [...this.criterion().questions, variant] });
    this.newQuestion.set('');
    this.toast.success('Question added');
  }

  async updateQuestion(id: string, value: string) {
    const text = value.trim();
    const existing = this.criterion().questions.find((q) => q.id === id);
    if (!text || !existing || text === existing.text) return;
    await this.api.apiWrite('PATCH', `/api/question-bank/questions/${id}`, { text }, `q-${id}`);
    this.update.emit({ questions: this.criterion().questions.map((q) => (q.id === id ? { ...q, text } : q)) });
  }

  async deleteQuestion(id: string) {
    if (this.criterion().questions.length <= 1) {
      this.toast.error('Keep at least one question phrasing per criterion.');
      return;
    }
    await this.api.apiWrite('DELETE', `/api/question-bank/questions/${id}`);
    this.update.emit({ questions: this.criterion().questions.filter((q) => q.id !== id) });
  }
}
