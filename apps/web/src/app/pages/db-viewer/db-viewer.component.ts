import { Component, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { TextareaDirective } from '../../ui/textarea.directive';
import { AlertComponent, AlertDescriptionComponent, AlertTitleComponent } from '../../ui/alert.component';

interface TableInfo {
  name: string;
  rowCount: number;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total?: number;
  truncated?: boolean;
}

@Component({
  selector: 'app-db-viewer',
  standalone: true,
  imports: [
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CardTitleComponent,
    ButtonComponent,
    TextareaDirective,
    AlertComponent,
    AlertTitleComponent,
    AlertDescriptionComponent,
  ],
  templateUrl: './db-viewer.component.html',
})
export class DbViewerComponent {
  private api = inject(ApiClientService);

  tables = signal<TableInfo[]>([]);
  activeTable = signal<string | null>(null);
  result = signal<QueryResult | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);
  sql = signal('SELECT * FROM classes LIMIT 20');

  constructor() {
    this.refreshTables();
  }

  async refreshTables() {
    const data = await this.api.apiGet<TableInfo[]>('/api/db-viewer/tables');
    this.tables.set(data ?? []);
  }

  async browseTable(name: string) {
    this.activeTable.set(name);
    this.error.set(null);
    this.loading.set(true);
    try {
      const res = await fetch(`/api/db-viewer/tables/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load table');
      this.result.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load table');
      this.result.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async runQuery() {
    this.activeTable.set(null);
    this.error.set(null);
    this.loading.set(true);
    try {
      const res = await fetch('/api/db-viewer/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: this.sql() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Query failed');
      this.result.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Query failed');
      this.result.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  cellText(value: unknown): string {
    if (value === null || value === undefined) return '∅';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
