import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type { ClassData } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';

@Component({
  selector: 'app-bulk-import',
  standalone: true,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, ButtonComponent],
  templateUrl: './bulk-import.component.html',
})
export class BulkImportComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  classData = input.required<ClassData>();
  update = output<ClassData>();

  paste = signal('');
  saving = signal(false);

  totalSlots = computed(() => this.classData().teams.reduce((n, t) => n + t.students.length, 0));

  async apply() {
    const names = this.paste()
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    this.saving.set(true);
    const res = await this.api.apiWrite<ClassData & { applied: number; totalSlots: number }>(
      'PATCH',
      `/api/classes/${this.classData().class.id}/autofill`,
      { names },
      `class-autofill-${this.classData().class.id}`
    );
    this.update.emit({ class: res.class, teams: res.teams });
    this.saving.set(false);
    this.paste.set('');
    if (typeof res.applied === 'number') {
      const leftover = names.length - res.applied;
      this.toast.success(
        leftover > 0
          ? `Applied ${res.applied} of ${res.totalSlots} slots - ${leftover} name(s) had no team slot left.`
          : `Applied ${res.applied} of ${res.totalSlots} slots.`
      );
    }
  }
}
