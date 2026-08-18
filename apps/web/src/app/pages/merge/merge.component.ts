import { Component, computed, signal } from '@angular/core';
import * as XLSX from 'xlsx';
import { studentGrandTotals } from '../../core/rollup';
import type { RosterExportRow, SectionScoreExportRow, ReviewTotalExportRow } from '../../core/models/types';
import { ButtonComponent } from '../../ui/button.component';
import { CardComponent, CardContentComponent } from '../../ui/card.component';

@Component({
  selector: 'app-merge',
  standalone: true,
  imports: [ButtonComponent, CardComponent, CardContentComponent],
  templateUrl: './merge.component.html',
})
export class MergeComponent {
  roster = signal<RosterExportRow[]>([]);
  sectionScores = signal<SectionScoreExportRow[]>([]);
  reviewTotals = signal<ReviewTotalExportRow[]>([]);
  fileNames = signal<string[]>([]);
  error = signal<string | null>(null);

  grandTotals = computed(() =>
    studentGrandTotals(this.reviewTotals()).sort((a, b) => {
      if (a.Class !== b.Class) return a.Class.localeCompare(b.Class);
      if (a.Team !== b.Team) return a.Team.localeCompare(b.Team);
      return a.Student.localeCompare(b.Student);
    })
  );
  classCount = computed(() => new Set(this.grandTotals().map((r) => r.Class)).size);

  async handleFiles(input: HTMLInputElement) {
    const files = input.files;
    if (!files || files.length === 0) return;
    this.error.set(null);
    const newRoster: RosterExportRow[] = [];
    const newSectionScores: SectionScoreExportRow[] = [];
    const newReviewTotals: ReviewTotalExportRow[] = [];
    const names: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        if (wb.Sheets['Roster']) {
          newRoster.push(...(XLSX.utils.sheet_to_json(wb.Sheets['Roster']) as RosterExportRow[]));
        }
        if (wb.Sheets['SectionScores']) {
          newSectionScores.push(...(XLSX.utils.sheet_to_json(wb.Sheets['SectionScores']) as SectionScoreExportRow[]));
        }
        if (wb.Sheets['ReviewTotals']) {
          newReviewTotals.push(...(XLSX.utils.sheet_to_json(wb.Sheets['ReviewTotals']) as ReviewTotalExportRow[]));
        }
        names.push(file.name);
      } catch {
        this.error.set(`Couldn't read "${file.name}" - is it an export from this app?`);
      }
    }

    this.roster.update((prev) => [...prev, ...newRoster]);
    this.sectionScores.update((prev) => [...prev, ...newSectionScores]);
    this.reviewTotals.update((prev) => [...prev, ...newReviewTotals]);
    this.fileNames.update((prev) => [...prev, ...names]);
    input.value = '';
  }

  downloadMerged() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.roster()), 'Roster');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.sectionScores()), 'SectionScores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.reviewTotals()), 'ReviewTotals');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.grandTotals()), 'GrandTotals');
    XLSX.writeFile(wb, 'review-grader-master.xlsx');
  }

  reset() {
    this.roster.set([]);
    this.sectionScores.set([]);
    this.reviewTotals.set([]);
    this.fileNames.set([]);
    this.error.set(null);
  }
}
