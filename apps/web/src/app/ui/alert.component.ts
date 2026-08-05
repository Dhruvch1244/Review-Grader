import { Component, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const alertVariants = cva('relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'bg-card text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `<ng-content />`,
  host: { role: 'alert', '[class]': 'classes()' },
})
export class AlertComponent {
  variant = input<AlertVariant>('default');
  class = input<string>('');
  classes = computed(() => cn(alertVariants({ variant: this.variant() }), this.class()));
}

@Component({
  selector: 'app-alert-title',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class AlertTitleComponent {
  class = input<string>('');
  classes = computed(() => cn('font-medium', this.class()));
}

@Component({
  selector: 'app-alert-description',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class AlertDescriptionComponent {
  class = input<string>('');
  classes = computed(() => cn('text-sm text-muted-foreground', this.class()));
}
