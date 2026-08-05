import { Component, inject, input, output } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ClassData, StudentRow, TeamWithStudents } from '../../core/models/types';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from '../../ui/card.component';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';
import { SelectDirective } from '../../ui/select.directive';

@Component({
  selector: 'app-team-roster',
  standalone: true,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    ButtonComponent,
    InputDirective,
    SelectDirective,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './team-roster.component.html',
})
export class TeamRosterComponent {
  private api = inject(ApiClientService);

  classData = input.required<ClassData>();
  team = input.required<TeamWithStudents>();
  update = output<ClassData>();

  private patchTeamLocally(updated: TeamWithStudents) {
    this.update.emit({
      ...this.classData(),
      teams: this.classData().teams.map((t) => (t.id === updated.id ? updated : t)),
    });
  }

  renameLocally(studentId: string, value: string) {
    this.patchTeamLocally({
      ...this.team(),
      students: this.team().students.map((s) => (s.id === studentId ? { ...s, name: value } : s)),
    });
  }

  async commitRename(studentId: string, value: string) {
    await this.api.apiWrite('PATCH', `/api/students/${studentId}`, { name: value }, `rename-${studentId}`);
  }

  async moveStudent(studentId: string, targetTeamId: string) {
    if (targetTeamId === this.team().id) return;
    const student = this.team().students.find((s) => s.id === studentId);
    if (!student) return;
    const targetTeam = this.classData().teams.find((t) => t.id === targetTeamId);
    this.update.emit({
      ...this.classData(),
      teams: this.classData().teams.map((t) => {
        if (t.id === this.team().id) return { ...t, students: t.students.filter((s) => s.id !== studentId) };
        if (t.id === targetTeamId && targetTeam) return { ...t, students: [...t.students, student] };
        return t;
      }),
    });
    await this.api.apiWrite('PATCH', `/api/students/${studentId}/team`, { teamId: targetTeamId }, `move-${studentId}`);
  }

  async addMember() {
    const student = await this.api.apiWrite<StudentRow>('POST', `/api/teams/${this.team().id}/students`, {});
    this.patchTeamLocally({ ...this.team(), students: [...this.team().students, student] });
  }

  async removeMember(studentId: string) {
    this.patchTeamLocally({ ...this.team(), students: this.team().students.filter((s) => s.id !== studentId) });
    await this.api.apiWrite('DELETE', `/api/students/${studentId}`, undefined, `delete-student-${studentId}`);
  }

  async removeTeam() {
    this.update.emit({ ...this.classData(), teams: this.classData().teams.filter((t) => t.id !== this.team().id) });
    await this.api.apiWrite('DELETE', `/api/teams/${this.team().id}`, undefined, `delete-team-${this.team().id}`);
  }
}
