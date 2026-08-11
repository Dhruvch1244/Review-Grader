import { Component, inject, input, output, signal } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ClassData, ClassReviewerRow } from '../../core/models/types';
import { ButtonComponent } from '../../ui/button.component';
import { InputDirective } from '../../ui/input.directive';

@Component({
  selector: 'app-class-reviewers',
  standalone: true,
  imports: [ButtonComponent, InputDirective, LucidePlus, LucideTrash2],
  templateUrl: './class-reviewers.component.html',
})
export class ClassReviewersComponent {
  private api = inject(ApiClientService);

  classData = input.required<ClassData>();
  update = output<ClassData>();

  newName = signal('');

  private patchLocally(reviewers: ClassReviewerRow[]) {
    this.update.emit({ ...this.classData(), reviewers });
  }

  async addReviewer() {
    const name = this.newName().trim();
    if (!name) return;
    this.newName.set('');
    const reviewer = await this.api.apiWrite<ClassReviewerRow>(
      'POST',
      `/api/classes/${this.classData().class.id}/reviewers`,
      { name }
    );
    this.patchLocally([...this.classData().reviewers, reviewer]);
  }

  renameLocally(id: string, name: string) {
    this.patchLocally(this.classData().reviewers.map((r) => (r.id === id ? { ...r, name } : r)));
  }

  async commitRename(id: string, name: string) {
    await this.api.apiWrite('PATCH', `/api/classes/reviewers/${id}`, { name }, `rename-reviewer-${id}`);
  }

  async removeReviewer(id: string) {
    this.patchLocally(this.classData().reviewers.filter((r) => r.id !== id));
    await this.api.apiWrite('DELETE', `/api/classes/reviewers/${id}`, undefined, `delete-reviewer-${id}`);
  }
}
