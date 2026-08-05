import { Directive, input } from '@angular/core';

/**
 * A real native <select>, styled to match the old base-ui trigger's
 * look (h-8/h-7, rounded-lg, border-input, focus ring). Trades the
 * floating-popup animation for full native keyboard/a11y/form behavior -
 * every actual use in this app (team-move dropdown, review-focus picker)
 * is a simple single-choice list, so the native control is a safe swap.
 */
@Directive({
  selector: 'select[appSelect]',
  standalone: true,
  host: {
    '[class]':
      '"flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 " + (size() === "sm" ? "h-7 rounded-[min(var(--radius-md),10px)] py-1 text-xs" : "h-8 py-2")',
  },
})
export class SelectDirective {
  size = input<'default' | 'sm'>('default');
}
