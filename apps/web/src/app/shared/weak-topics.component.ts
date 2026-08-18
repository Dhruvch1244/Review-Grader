import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ApiClientService } from '../core/services/api-client.service';
import type { WeakTopicRow } from '../core/models/types';
import { BadgeComponent } from '../ui/badge.component';

const POLL_INTERVAL_MS = 7000;

/** Replaces the old per-student asked-questions log: instead of generating
 * or logging individual questions, this just surfaces which subtopics a
 * team is weakest on (avg rating below "Meets") across every review scored
 * so far, worst first. */
@Component({
  selector: 'app-weak-topics',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './weak-topics.component.html',
})
export class WeakTopicsComponent {
  private api = inject(ApiClientService);

  teamId = input.required<string>();

  weakTopics = signal<WeakTopicRow[]>([]);

  constructor() {
    effect(
      (onCleanup) => {
        const teamId = this.teamId();
        let cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });
        this.fetch(teamId);
      },
      { allowSignalWrites: true }
    );

    const poll = setInterval(() => this.fetch(this.teamId()), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(poll));
  }

  private async fetch(teamId: string) {
    const data = await this.api.apiGet<WeakTopicRow[]>(`/api/weak-topics?teamId=${teamId}`);
    if (teamId !== this.teamId()) return;
    this.weakTopics.set(data ?? []);
  }
}
