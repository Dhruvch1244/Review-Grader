import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DarkModeService } from './core/services/dark-mode.service';
import { ApiClientService } from './core/services/api-client.service';
import { SyncStatusComponent } from './shared/sync-status.component';
import { ToasterComponent } from './ui/toaster.component';

const NAV_LINKS = [
  { href: '/setup', label: 'Setup' },
  { href: '/questions', label: 'Question bank' },
  { href: '/normalize', label: 'Normalize' },
  { href: '/merge', label: 'Merge' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SyncStatusComponent, ToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  // Injected purely to run their constructors once at app start - mirrors
  // the old root layout mounting <ThemeSync/> and SyncStatus's mount-time
  // startAutoSync() call.
  private darkMode = inject(DarkModeService);
  private api = inject(ApiClientService);

  navLinks = NAV_LINKS;

  constructor() {
    this.api.startAutoSync();
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // offline app-shell caching is a nice-to-have; ignore failures
      });
    }
  }
}
