import { Component, computed, signal } from '@angular/core';
import * as XLSX from 'xlsx';
import { buildSummaryRows, overallByStudent } from '../../core/rollup';
import type { RosterExportRow, TeamScoreExportRow, IndividualScoreExportRow } from '../../core/models/types';
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
  teamScores = signal<TeamScoreExportRow[]>([]);
  individualScores = signal<IndividualScoreExportRow[]>([]);
  fileNames = signal<string[]>([]);
  error = signal<string | null>(null);

  summary = computed(() => buildSummaryRows(this.teamScores(), this.individualScores()));
  overall = computed(() =>
    overallByStudent(this.summary()).sort((a, b) => {
      if (a.Class !== b.Class) return a.Class.localeCompare(b.Class);
      if (a.Team !== b.Team) return a.Team.localeCompare(b.Team);
      return a.Student.localeCompare(b.Student);
    })
  );
  classCount = computed(() => new Set(this.overall().map((r) => r.Class)).size);

  async handleFiles(input: HTMLInputElement) {
    const files = input.files;
    if (!files || files.length === 0) return;
    this.error.set(null);
    const newRoster: RosterExportRow[] = [];
    const newTeamScores: TeamScoreExportRow[] = [];
    const newIndividualScores: IndividualScoreExportRow[] = [];
    const names: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        if (wb.Sheets['Roster']) {
          newRoster.push(...(XLSX.utils.sheet_to_json(wb.Sheets['Roster']) as RosterExportRow[]));
        }
        if (wb.Sheets['TeamScores']) {
          newTeamScores.push(...(XLSX.utils.sheet_to_json(wb.Sheets['TeamScores']) as TeamScoreExportRow[]));
        }
        if (wb.Sheets['IndividualScores']) {
          newIndividualScores.push(
            ...(XLSX.utils.sheet_to_json(wb.Sheets['IndividualScores']) as IndividualScoreExportRow[])
          );
        }
        names.push(file.name);
      } catch {
        this.error.set(`Couldn't read "${file.name}" - is it an export from this app?`);
      }
    }

    this.roster.update((prev) => [...prev, ...newRoster]);
    this.teamScores.update((prev) => [...prev, ...newTeamScores]);
    this.individualScores.update((prev) => [...prev, ...newIndividualScores]);
    this.fileNames.update((prev) => [...prev, ...names]);
    input.value = '';
  }

  downloadMerged() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.roster()), 'Roster');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.teamScores()), 'TeamScores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.individualScores()), 'IndividualScores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.summary()), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.overall()), 'Overall');
    XLSX.writeFile(wb, 'review-grader-master.xlsx');
  }

  reset() {
    this.roster.set([]);
    this.teamScores.set([]);
    this.individualScores.set([]);
    this.fileNames.set([]);
    this.error.set(null);
  }
}
