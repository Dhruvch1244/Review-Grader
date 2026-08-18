import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { ApiClientService } from '../../core/services/api-client.service';
import { DarkModeService } from '../../core/services/dark-mode.service';
import { CATEGORICAL_LIGHT, CATEGORICAL_DARK, CHROME, STATUS, sequentialBlue } from '../../core/chart-colors';
import { buildExportRows } from '../../core/export-rows';
import {
  teamPercentages,
  teamTrendByReview,
  classAverageTrend,
  teamLeaderboard,
  categoryBreakdownByReview,
  sectionHeatmap,
  scoreHistogram,
  technicalVsNonTechnicalScatter,
  scoreHealthByReview,
  radarDataForReview,
} from '../../core/stats-utils';
import type { ClassData, ReviewDef, ReviewSectionDef, SectionScoreRow, ReviewTotalRow } from '../../core/models/types';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ChartCardComponent } from '../../ui/chart-card.component';
import { EmptyStateComponent } from '../../ui/empty-state.component';

type ReviewWithSections = ReviewDef & { sections: ReviewSectionDef[] };

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    RouterLink,
    BaseChartDirective,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    BadgeComponent,
    ChartCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './stats.component.html',
})
export class StatsComponent {
  private api = inject(ApiClientService);
  private darkMode = inject(DarkModeService);

  classId = input.required<string>();

  classData = signal<ClassData | null>(null);
  reviews = signal<ReviewWithSections[]>([]);
  sectionScores = signal<SectionScoreRow[]>([]);
  reviewTotals = signal<ReviewTotalRow[]>([]);
  reviewFocus = signal<number | 'all'>('all');
  radarTeams = signal<string[]>([]);

  constructor() {
    effect(() => {
      const classId = this.classId();
      this.api.apiGet<ClassData>(`/api/classes/${classId}`).then((d) => {
        if (d) {
          this.classData.set(d);
          if (this.radarTeams().length === 0) {
            this.radarTeams.set(d.teams.slice(0, 3).map((t) => t.name));
          }
        }
      });
      this.api.apiGet<ReviewWithSections[]>('/api/reviews').then((r) => this.reviews.set(r ?? []));
      this.api
        .apiGet<{ sectionScores: SectionScoreRow[]; reviewTotals: ReviewTotalRow[] }>(`/api/scores?classId=${classId}`)
        .then((d) => {
          if (!d) return;
          this.sectionScores.set(d.sectionScores);
          this.reviewTotals.set(d.reviewTotals);
        });
    });
  }

  private rows = computed(() => {
    const classData = this.classData();
    const reviews = this.reviews();
    if (!classData || reviews.length === 0) return null;
    return buildExportRows(classData, reviews, this.sectionScores(), this.reviewTotals());
  });

  ready = computed(() => this.classData() !== null && this.rows() !== null && this.reviews().length > 0);

  heatmapReview = computed(() => {
    const reviews = this.reviews();
    const focus = this.reviewFocus();
    return focus === 'all' ? reviews[reviews.length - 1] : reviews.find((r) => r.number === focus);
  });

  teamAverages = computed(() => (this.rows() ? teamPercentages(this.rows()!.reviewTotalRows) : []));
  teamTrend = computed(() =>
    this.rows() ? teamTrendByReview(this.classData()!, this.reviews(), this.rows()!.reviewTotalRows) : []
  );
  classTrend = computed(() => (this.rows() ? classAverageTrend(this.reviews(), this.rows()!.reviewTotalRows) : []));
  leaderboard = computed(() => (this.rows() ? teamLeaderboard(this.rows()!.reviewTotalRows) : []));
  categoryTrend = computed(() =>
    this.rows() ? categoryBreakdownByReview(this.reviews(), this.rows()!.reviewTotalRows) : []
  );
  histogram = computed(() => (this.rows() ? scoreHistogram(this.rows()!.reviewTotalRows) : []));
  scatter = computed(() => (this.rows() ? technicalVsNonTechnicalScatter(this.rows()!.reviewTotalRows) : []));
  health = computed(() => (this.rows() ? scoreHealthByReview(this.reviews(), this.rows()!.sectionScoreRows) : []));
  heatmap = computed(() => {
    const review = this.heatmapReview();
    return review && this.rows() ? sectionHeatmap(this.classData()!, review, this.rows()!.sectionScoreRows) : null;
  });
  radar = computed(() => {
    const review = this.heatmapReview();
    return review && this.rows() ? radarDataForReview(review, this.rows()!.sectionScoreRows, this.radarTeams()) : null;
  });

  scoredTeams = computed(() => this.leaderboard().filter((t) => t.reviewsScored > 0).length);
  totalStudents = computed(() => (this.classData()?.teams ?? []).reduce((n, t) => n + t.students.length, 0));
  classOverallAvg = computed(() => {
    const lb = this.leaderboard();
    if (lb.length === 0) return null;
    const withScore = lb.filter((t) => t.overall !== null);
    return (
      Math.round((lb.reduce((sum, t) => sum + (t.overall ?? 0), 0) / Math.max(1, withScore.length)) * 100) / 100
    );
  });

  healthAllZero = computed(() => this.health().every((h) => h.Low + h.Mid + h.High === 0));
  scatterHasData = computed(() => this.scatter().filter((s) => s.technicalPct !== null).length > 0);

  private dark = computed(() => this.darkMode.isDark());
  private categorical = computed(() => (this.dark() ? CATEGORICAL_DARK : CATEGORICAL_LIGHT));
  private chrome = computed(() => (this.dark() ? CHROME.dark : CHROME.light));

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

  // 1. Team comparison
  teamComparisonData = computed<ChartData<'bar'>>(() => ({
    labels: this.teamAverages().map((t) => t.team),
    datasets: [
      {
        label: 'Overall %',
        data: this.teamAverages().map((t) => t.percentage),
        backgroundColor: sequentialBlue(0.7, this.dark()),
        borderRadius: 4,
        maxBarThickness: 56,
      },
    ],
  }));
  teamComparisonOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: this.axisOptions(), y: { ...this.axisOptions(), min: 0, max: 100 } },
    plugins: {
      legend: { display: false },
      tooltip: this.tooltipOptions(),
      datalabels: { anchor: 'end', align: 'top', color: this.chrome().textSecondary, font: { size: 11 } },
    },
  }));

  // 2. Team trend across reviews
  teamTrendData = computed<ChartData<'line'>>(() => ({
    labels: this.teamTrend().map((r) => r['review']),
    datasets: (this.classData()?.teams ?? []).map((t, i) => ({
      label: t.name,
      data: this.teamTrend().map((r) => r[t.name] as number | null),
      borderColor: this.categorical()[i % this.categorical().length],
      backgroundColor: this.categorical()[i % this.categorical().length],
      borderWidth: 2,
      tension: 0.3,
      spanGaps: true,
      pointRadius: 3,
    })),
  }));
  teamTrendOptions = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: this.axisOptions(), y: { ...this.axisOptions(), min: 0, max: 100 } },
    plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } }, tooltip: this.tooltipOptions(), datalabels: { display: false } },
  }));

  // 3. Class average trend
  classTrendData = computed<ChartData<'line'>>(() => ({
    labels: this.classTrend().map((r) => r.review),
    datasets: [
      {
        label: 'Class avg %',
        data: this.classTrend().map((r) => r.avg),
        borderColor: this.categorical()[0],
        backgroundColor: this.categorical()[0],
        borderWidth: 2,
        tension: 0.3,
        spanGaps: true,
        pointRadius: 4,
      },
    ],
  }));
  classTrendOptions = computed<ChartConfiguration<'line'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: this.axisOptions(), y: { ...this.axisOptions(), min: 0, max: 100 } },
    plugins: { legend: { display: false }, tooltip: this.tooltipOptions(), datalabels: { display: false } },
  }));

  // 4. Category breakdown by review
  categoryTrendData = computed<ChartData<'bar'>>(() => ({
    labels: this.categoryTrend().map((r) => r.review),
    datasets: [
      { label: 'Technical', data: this.categoryTrend().map((r) => r.Technical), backgroundColor: this.categorical()[0], borderRadius: 4, maxBarThickness: 40 },
      { label: 'Non-Technical', data: this.categoryTrend().map((r) => r.NonTechnical), backgroundColor: this.categorical()[1], borderRadius: 4, maxBarThickness: 40 },
    ],
  }));
  categoryTrendOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: this.axisOptions(), y: { ...this.axisOptions(), min: 0, max: 100 } },
    plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } }, tooltip: this.tooltipOptions(), datalabels: { display: false } },
  }));

  // 5. Team leaderboard (horizontal bar)
  leaderboardHeight = computed(() => Math.max(220, this.leaderboard().length * 26));
  leaderboardData = computed<ChartData<'bar'>>(() => ({
    labels: this.leaderboard().map((t) => t.team),
    datasets: [
      {
        label: 'Overall %',
        data: this.leaderboard().map((t) => t.overall),
        backgroundColor: sequentialBlue(0.6, this.dark()),
        borderRadius: 4,
        maxBarThickness: 16,
      },
    ],
  }));
  leaderboardOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { ...this.axisOptions(), min: 0, max: 100 }, y: this.axisOptions() },
    plugins: {
      legend: { display: false },
      tooltip: this.tooltipOptions(),
      datalabels: { anchor: 'end', align: 'right', color: this.chrome().textSecondary, font: { size: 11 } },
    },
  }));

  // 6. Score distribution histogram
  histogramData = computed<ChartData<'bar'>>(() => ({
    labels: this.histogram().map((h) => h.bucket),
    datasets: [
      {
        label: 'Teams',
        data: this.histogram().map((h) => h.count),
        backgroundColor: sequentialBlue(0.5, this.dark()),
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }));
  histogramOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: this.axisOptions(), y: { ...this.axisOptions(), ticks: { ...this.axisOptions().ticks, precision: 0 } } },
    plugins: {
      legend: { display: false },
      tooltip: { ...this.tooltipOptions(), callbacks: { label: (ctx) => `Teams: ${ctx.formattedValue}` } },
      datalabels: { display: false },
    },
  }));

  // 7. Score health (stacked bar)
  healthData = computed<ChartData<'bar'>>(() => ({
    labels: this.health().map((h) => h.review),
    datasets: [
      { label: 'Low', data: this.health().map((h) => h.Low), backgroundColor: STATUS.critical, maxBarThickness: 48 },
      { label: 'Mid', data: this.health().map((h) => h.Mid), backgroundColor: STATUS.warning, maxBarThickness: 48 },
      { label: 'High', data: this.health().map((h) => h.High), backgroundColor: STATUS.good, borderRadius: 4, maxBarThickness: 48 },
    ],
  }));
  healthOptions = computed<ChartConfiguration<'bar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ...this.axisOptions(), stacked: true },
      y: { ...this.axisOptions(), stacked: true, ticks: { ...this.axisOptions().ticks, precision: 0 } },
    },
    plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } }, tooltip: this.tooltipOptions(), datalabels: { display: false } },
  }));

  // 8. Technical vs Non-Technical scatter (Review 1 only)
  scatterPoints = computed(() => this.scatter().filter((s) => s.technicalPct !== null));
  scatterData = computed<ChartData<'scatter'>>(() => ({
    datasets: [
      {
        label: 'Teams',
        data: this.scatterPoints().map((s) => ({ x: s.technicalPct, y: s.nonTechnicalPct })),
        backgroundColor: this.categorical()[0],
        pointRadius: 5,
      },
    ],
  }));
  scatterOptions = computed<ChartConfiguration<'scatter'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ...this.axisOptions(), min: 0, max: 100, title: { display: true, text: 'Technical %', font: { size: 11 }, color: this.chrome().muted } },
      y: { ...this.axisOptions(), min: 0, max: 100, title: { display: true, text: 'Non-Technical %', font: { size: 11 }, color: this.chrome().muted } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...this.tooltipOptions(),
        callbacks: { label: (ctx) => this.scatterPoints()[ctx.dataIndex]?.team ?? '' },
      },
      datalabels: {
        align: 'right',
        anchor: 'end',
        color: this.chrome().textSecondary,
        font: { size: 11 },
        formatter: (_value, ctx) => this.scatterPoints()[ctx.dataIndex]?.team ?? '',
      },
    },
  }));

  // 10. Radar
  radarData = computed<ChartData<'radar'>>(() => {
    const radar = this.radar();
    const teams = this.radarTeams();
    if (!radar) return { labels: [], datasets: [] };
    return {
      labels: radar.data.map((d) => d['axis'] as string),
      datasets: teams.map((teamName, i) => ({
        label: teamName,
        data: radar.data.map((d) => (d[teamName] as number) ?? 0),
        borderColor: this.categorical()[i % this.categorical().length],
        backgroundColor: this.categorical()[i % this.categorical().length] + '26',
        borderWidth: 2,
        fill: true,
      })),
    };
  });
  radarOptions = computed<ChartConfiguration<'radar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        pointLabels: { font: { size: 9 }, color: this.chrome().muted },
        ticks: { font: { size: 9 }, color: this.chrome().muted, backdropColor: 'transparent' },
        grid: { color: this.chrome().grid },
        angleLines: { color: this.chrome().grid },
      },
    },
    plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } }, tooltip: this.tooltipOptions(), datalabels: { display: false } },
  }));

  setReviewFocus(focus: number | 'all') {
    this.reviewFocus.set(focus);
  }

  toggleRadarTeam(name: string) {
    const active = this.radarTeams().includes(name);
    if (active) {
      this.radarTeams.set(this.radarTeams().filter((n) => n !== name));
    } else if (this.radarTeams().length < 3) {
      this.radarTeams.set([...this.radarTeams(), name]);
    }
  }

  radarTeamColor(name: string): string | undefined {
    const idx = this.radarTeams().indexOf(name);
    if (idx === -1) return undefined;
    return this.categorical()[idx % this.categorical().length];
  }

  heatCellColor(v: number | null): string {
    return v === null ? 'transparent' : sequentialBlue(v / 100, this.dark());
  }

  dashedBorder(): string {
    return `1px dashed ${this.chrome().baseline}`;
  }

  cellTextColor(v: number | null): string {
    if (v === null) return this.chrome().muted;
    return v / 100 > 0.55 ? '#fff' : this.chrome().textPrimary;
  }
}
