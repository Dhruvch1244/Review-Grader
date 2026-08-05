import { Component, computed, input, output } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { cn } from './utils';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [LucideCheck],
  template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="ariaLabel()"
      [class]="classes()"
      (click)="toggle()"
    >
      @if (checked()) {
        <svg lucideCheck class="size-3.5"></svg>
      }
    </button>
  `,
})
export class CheckboxComponent {
  checked = input(false);
  ariaLabel = input<string>('');
  class = input<string>('');
  checkedChange = output<boolean>();

  classes = computed(() =>
    cn(
      'relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
      this.checked() && 'border-primary bg-primary text-primary-foreground',
      this.class()
    )
  );

  toggle() {
    this.checkedChange.emit(!this.checked());
  }
}
