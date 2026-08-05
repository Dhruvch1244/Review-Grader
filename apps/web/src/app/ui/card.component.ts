import { Component, computed, input } from '@angular/core';
import { cn } from './utils';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
  },
})
export class CardComponent {
  class = input<string>('');
  classes = computed(() =>
    cn(
      "flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10",
      this.class()
    )
  );
}

@Component({
  selector: 'app-card-header',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class CardHeaderComponent {
  class = input<string>('');
  classes = computed(() => cn('grid auto-rows-min items-start gap-1 px-4', this.class()));
}

@Component({
  selector: 'app-card-title',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class CardTitleComponent {
  class = input<string>('');
  classes = computed(() => cn('text-base leading-snug font-medium', this.class()));
}

@Component({
  selector: 'app-card-description',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class CardDescriptionComponent {
  class = input<string>('');
  classes = computed(() => cn('text-sm text-muted-foreground', this.class()));
}

@Component({
  selector: 'app-card-content',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class CardContentComponent {
  class = input<string>('');
  classes = computed(() => cn('px-4', this.class()));
}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class CardFooterComponent {
  class = input<string>('');
  classes = computed(() => cn('flex items-center rounded-b-xl border-t bg-muted/50 p-4', this.class()));
}
