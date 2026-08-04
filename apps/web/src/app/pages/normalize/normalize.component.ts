import { Component, computed, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { LucideInfo } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { DarkModeService } from '../../core/services/dark-mode.service';
import { CHROME, sequentialBlue } from '../../core/chart-colors';
import type { ClassNormSummary, StudentNormRow } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { AlertComponent, AlertDescriptionComponent, AlertTitleComponent } from '../../ui/alert.component';

@Component({
  selector: 'app-normalize',
  standalone: true,
  imports: [
    BaseChartDirective,
    LucideInfo,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    AlertComponent,
    AlertTitleComponent,
    AlertDescriptionComponent,
  ],
  templateUrl: './normalize.component.html',
})
export class NormalizeComponent {
  private api = inject(ApiClientService);
  private darkMode = inject(DarkModeService);

  data = signal<{ perClass: ClassNormSummary[]; students: StudentNormRow[] } | null>(null);

  constructor() {
    this.api.apiGet<{ perClass: ClassNormSummary[]; students: StudentNormRow[] }>('/api/normalize').then((d) => {
      if (d) this.data.set(d);
    });
  }

  private chrome = computed(() => (this.darkMode.isDark() ? CHROME.dark : CHROME.light));

  private axisOptions = computed(() => ({
    ticks: { font: { size: 11 }, color: this.chrome().muted },
    grid: { color: this.chrome().grid },
    border: { color: this.chrome().baseline },
  }));

  private tooltipOptions = computed(() => ({
    backgroundColor: this.chrome().surface,
    borderColor: this.chrome().grid,
    borderWidth: 1,
    titleColor: this.chrome().textPrimary,
    bodyColor: this.chrome().textPrimary,
  }));

  rawChartData = computed<ChartData<'bar'>>(() => ({
    labels: (this.data()?.perClass ?? []).map((c) => c.className),
    datasets: [
      {
        label: 'Mean',
        data: (this.data()?.perClass ?? []).map((c) => c.mean),
        backgroundColor: sequentialBlue(0.6, this.darkMode.isDark()),
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }));

  rawChartOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: this.axisOptions(),
      y: { ...this.axisOptions(), min: 0, max: 6 },
    },
    plugins: {
      legend: { display: false },
      tooltip: this.tooltipOptions(),
      datalabels: { anchor: 'end', align: 'top', color: this.chrome().textSecondary, font: { size: 11 } },
    },
  }));

  normalizedChartData = computed<ChartData<'bar'>>(() => ({
    labels: (this.data()?.perClass ?? []).map((c) => c.className),
    datasets: [
      {
        label: 'Normalized mean',
        data: (this.data()?.perClass ?? []).map(() => 50),
        backgroundColor: sequentialBlue(0.4, this.darkMode.isDark()),
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }));

  normalizedChartOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: this.axisOptions(),
      y: { ...this.axisOptions(), min: 0, max: 100 },
    },
    plugins: {
      legend: { display: false },
      tooltip: this.tooltipOptions(),
      datalabels: { anchor: 'end', align: 'top', color: this.chrome().textSecondary, font: { size: 11 } },
    },
  }));

  zLabel(z: number): string {
    return z > 0 ? `+${z}` : String(z);
  }
}
