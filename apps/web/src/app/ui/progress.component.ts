import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress',
  standalone: true,
  template: `
    <div class="relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted">
      <div class="h-full bg-primary transition-all" [style.width.%]="percent()"></div>
    </div>
  `,
  host: { class: 'flex flex-wrap gap-3' },
})
export class ProgressComponent {
  value = input(0);
  max = input(100);
  percent = computed(() => Math.max(0, Math.min(100, (this.value() / this.max()) * 100)));
}
