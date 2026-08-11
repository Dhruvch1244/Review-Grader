import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBarChart3, LucideClipboardList } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ClassRow } from '../../core/models/types';
import { CardComponent, CardContentComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';

@Component({
  selector: 'app-scoring-home',
  standalone: true,
  imports: [RouterLink, CardComponent, CardContentComponent, ButtonComponent, LucideBarChart3, LucideClipboardList],
  templateUrl: './scoring-home.component.html',
})
export class ScoringHomeComponent {
  private api = inject(ApiClientService);

  classes = signal<ClassRow[]>([]);

  constructor() {
    this.api.apiGet<ClassRow[]>('/api/classes').then((data) => this.classes.set(data ?? []));
  }
}
