import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="h-[180px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
      {{ message() }}
    </div>
  `,
})
export class EmptyStateComponent {
  message = input.required<string>();
}
