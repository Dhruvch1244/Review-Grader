import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DarkModeService } from './core/services/dark-mode.service';
import { ApiClientService } from './core/services/api-client.service';
import { RoleService } from './core/services/role.service';
import { SyncStatusComponent } from './shared/sync-status.component';
import { RoleChooserComponent } from './shared/role-chooser.component';
import { ToasterComponent } from './ui/toaster.component';

const ADMIN_NAV_LINKS = [
  { href: '/setup', label: 'Setup' },
  { href: '/reviewers', label: 'Reviewers' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/normalize', label: 'Normalize' },
  { href: '/merge', label: 'Merge' },
  { href: '/database', label: 'Database' },
];

const REVIEWER_NAV_LINKS = [
  { href: '/scoring', label: 'Scoring' },
  { href: '/normalize', label: 'Normalize' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SyncStatusComponent, RoleChooserComponent, ToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  // Injected purely to run their constructors once at app start - mirrors
  // the old root layout mounting <ThemeSync/> and SyncStatus's mount-time
  // startAutoSync() call.
  private darkMode = inject(DarkModeService);
  private api = inject(ApiClientService);
  role = inject(RoleService);

  navLinks = computed(() => (this.role.role() === 'admin' ? ADMIN_NAV_LINKS : REVIEWER_NAV_LINKS));

  constructor() {
    this.api.startAutoSync();
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // offline app-shell caching is a nice-to-have; ignore failures
      });
    }
  }

  /** Reopens the role chooser rather than silently flipping roles on one click. */
  switchRole() {
    this.role.reopenChooser();
  }
}
