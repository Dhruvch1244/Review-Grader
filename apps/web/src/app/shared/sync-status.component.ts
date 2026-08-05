import { Component, inject, signal } from '@angular/core';
import { ApiClientService } from '../core/services/api-client.service';
import { BadgeComponent } from '../ui/badge.component';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [BadgeComponent],
  template: `
    @if (online() && api.pendingCount() === 0) {
      <app-badge
        variant="outline"
        class="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Synced
      </app-badge>
    } @else {
      <button (click)="retry()" title="Click to retry syncing now" type="button">
        <app-badge
          variant="outline"
          class="gap-1.5 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 cursor-pointer"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {{ online() ? 'Online' : 'Offline' }}
          {{ api.pendingCount() > 0 ? ' · ' + api.pendingCount() + ' pending' : '' }}
        </app-badge>
      </button>
    }
  `,
})
export class SyncStatusComponent {
  api = inject(ApiClientService);
  online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    this.api.getPendingCount().then((n) => this.api.pendingCount.set(n));
  }

  retry() {
    void this.api.flushQueue();
  }
}
