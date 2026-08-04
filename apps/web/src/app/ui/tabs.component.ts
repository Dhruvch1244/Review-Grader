import { Component, computed, inject, input, output } from '@angular/core';
import { cn } from './utils';

@Component({
  selector: 'app-tabs',
  standalone: true,
  template: `<ng-content />`,
  host: { class: 'flex flex-col gap-2' },
})
export class TabsComponent {
  value = input.required<string>();
  valueChange = output<string>();

  select(v: string) {
    this.valueChange.emit(v);
  }
}

@Component({
  selector: 'app-tabs-list',
  standalone: true,
  template: `<ng-content />`,
  host: { class: 'inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground h-8' },
})
export class TabsListComponent {}

@Component({
  selector: 'app-tabs-trigger',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '(click)': 'onClick()',
  },
})
export class TabsTriggerComponent {
  private tabs = inject(TabsComponent);
  value = input.required<string>();

  private active = computed(() => this.tabs.value() === this.value());

  classes = computed(() =>
    cn(
      'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground cursor-pointer',
      this.active() && 'bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30'
    )
  );

  onClick() {
    this.tabs.select(this.value());
  }
}

@Component({
  selector: 'app-tabs-content',
  standalone: true,
  template: `
    @if (active()) {
      <ng-content />
    }
  `,
  host: { class: 'flex-1 text-sm outline-none' },
})
export class TabsContentComponent {
  private tabs = inject(TabsComponent);
  value = input.required<string>();
  active = computed(() => this.tabs.value() === this.value());
}
