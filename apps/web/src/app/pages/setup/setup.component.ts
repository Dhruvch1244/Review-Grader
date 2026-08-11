import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideBarChart3,
  LucideChevronDown,
  LucideChevronRight,
  LucideClipboardList,
  LucideDownload,
  LucidePlus,
  LucideShuffle,
} from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import { ToastService } from '../../ui/toast.service';
import { generateIndianNames } from '../../core/indian-names';
import type { ClassRow, ClassData } from '../../core/models/types';
import { CardComponent, CardContentComponent } from '../../ui/card.component';
import { BadgeComponent } from '../../ui/badge.component';
import { ButtonComponent } from '../../ui/button.component';
import { ClassSettingsComponent } from './class-settings.component';
import { ClassReviewersComponent } from './class-reviewers.component';
import { BulkImportComponent } from './bulk-import.component';
import { TeamRosterComponent } from './team-roster.component';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [
    RouterLink,
    CardComponent,
    CardContentComponent,
    BadgeComponent,
    ButtonComponent,
    ClassSettingsComponent,
    ClassReviewersComponent,
    BulkImportComponent,
    TeamRosterComponent,
    LucideAlertTriangle,
    LucideBarChart3,
    LucideChevronDown,
    LucideChevronRight,
    LucideClipboardList,
    LucideDownload,
    LucidePlus,
    LucideShuffle,
  ],
  templateUrl: './setup.component.html',
})
export class SetupComponent {
  private api = inject(ApiClientService);
  private toast = inject(ToastService);

  classes = signal<ClassRow[]>([]);
  expanded = signal<Record<string, ClassData>>({});

  constructor() {
    this.refreshList();
  }

  async refreshList() {
    const data = await this.api.apiGet<ClassRow[]>('/api/classes');
    this.classes.set(data ?? []);
  }

  async toggleExpand(classId: string) {
    if (this.expanded()[classId]) {
      const next = { ...this.expanded() };
      delete next[classId];
      this.expanded.set(next);
      return;
    }
    const data = await this.api.apiGet<ClassData>(`/api/classes/${classId}`);
    if (data) this.expanded.set({ ...this.expanded(), [classId]: data });
  }

  setClassData(classId: string, data: ClassData) {
    this.expanded.set({ ...this.expanded(), [classId]: data });
    this.classes.set(this.classes().map((c) => (c.id === classId ? data.class : c)));
  }

  async addTeam(classId: string) {
    await this.api.apiWrite('POST', `/api/classes/${classId}/teams`, {});
    const data = await this.api.apiGet<ClassData>(`/api/classes/${classId}`);
    if (data) this.setClassData(classId, data);
  }

  async shuffleNames(classId: string) {
    const totalSlots = this.expanded()[classId].teams.reduce((n, t) => n + t.students.length, 0);
    const names = generateIndianNames(totalSlots);
    const res = await this.api.apiWrite<ClassData>('PATCH', `/api/classes/${classId}/autofill`, { names });
    this.setClassData(classId, { class: res.class, teams: res.teams, reviewers: res.reviewers });
    this.toast.success('Shuffled in a fresh set of names');
  }

  async resetAll() {
    if (
      !window.confirm(
        'Reset ALL scores, ratings, and session state for every class? Rosters stay as they are. This can\'t be undone.'
      )
    ) {
      return;
    }
    await this.api.apiWrite('DELETE', '/api/reset-all');
    this.toast.success('All scoring data reset across every class');
  }
}
