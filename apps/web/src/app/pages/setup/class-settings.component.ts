import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ClassData } from '../../core/models/types';
import { InputDirective } from '../../ui/input.directive';

@Component({
  selector: 'app-class-settings',
  standalone: true,
  imports: [InputDirective],
  template: `
    <div class="flex items-end gap-3">
      <label class="text-sm">
        <span class="block text-muted-foreground mb-1">Reviewer</span>
        <input
          appInput
          [value]="reviewer()"
          (input)="reviewer.set($any($event.target).value)"
          (blur)="commitReviewer()"
          placeholder="assign a reviewer"
          class="w-56"
        />
      </label>
    </div>
  `,
})
export class ClassSettingsComponent implements OnInit {
  private api = inject(ApiClientService);

  classData = input.required<ClassData>();
  update = output<ClassData>();

  reviewer = signal('');

  ngOnInit() {
    this.reviewer.set(this.classData().class.reviewer_name ?? '');
  }

  async commitReviewer() {
    await this.api.apiWrite('PATCH', `/api/classes/${this.classData().class.id}`, { reviewerName: this.reviewer() });
    this.update.emit({
      ...this.classData(),
      class: { ...this.classData().class, reviewer_name: this.reviewer() || null },
    });
  }
}
