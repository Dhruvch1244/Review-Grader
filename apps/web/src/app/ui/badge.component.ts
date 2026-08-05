import { Component, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const badgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
        outline: 'border-border text-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');
  class = input<string>('');
  classes = computed(() => cn(badgeVariants({ variant: this.variant() }), this.class()));
}
