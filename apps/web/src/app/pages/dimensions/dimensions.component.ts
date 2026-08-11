import { Component, computed, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import type { DimensionDef } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';

@Component({
  selector: 'app-dimensions',
  standalone: true,
  imports: [CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent, ButtonComponent, InputDirective],
  templateUrl: './dimensions.component.html',
})
export class DimensionsComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  dimensions = signal<DimensionDef[]>([]);
  saving = signal(false);

  totalWeight = computed(() => Math.round(this.dimensions().reduce((sum, d) => sum + d.weightPercent, 0) * 100) / 100);
  totalValid = computed(() => Math.abs(this.totalWeight() - 100) < 0.5);

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await this.api.apiGet<DimensionDef[]>('/api/dimensions');
    this.dimensions.set(data ?? []);
  }

  setWeight(id: string, value: string) {
    const weightPercent = Number(value);
    if (Number.isNaN(weightPercent)) return;
    this.dimensions.set(this.dimensions().map((d) => (d.id === id ? { ...d, weightPercent } : d)));
  }

  async save() {
    if (!this.totalValid()) {
      this.toast.error('Weights must add up to 100 before saving');
      return;
    }
    this.saving.set(true);
    const weights = this.dimensions().map((d) => ({ id: d.id, weightPercent: d.weightPercent }));
    try {
      const updated = await this.api.apiWrite<DimensionDef[]>('PUT', '/api/dimensions', { weights });
      // Local state already reflects the edited weights optimistically (see
      // setWeight) - only adopt the server's echo if it's really the
      // dimension list, since apiWrite's offline fallback just echoes the
      // request body back, which isn't shaped like one.
      if (Array.isArray(updated)) this.dimensions.set(updated);
      this.toast.success('Dimension weights saved');
    } finally {
      this.saving.set(false);
    }
  }
}
