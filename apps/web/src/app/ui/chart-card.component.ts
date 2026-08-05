import { Component, input } from '@angular/core';
import { CardComponent, CardContentComponent, CardHeaderComponent, CardTitleComponent } from './card.component';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent],
  template: `
    <app-card class="min-w-0">
      <app-card-header class="pb-0">
        <app-card-title class="text-sm">{{ title() }}</app-card-title>
        @if (subtitle()) {
          <p class="text-xs text-muted-foreground">{{ subtitle() }}</p>
        }
      </app-card-header>
      <app-card-content>
        <ng-content />
      </app-card-content>
    </app-card>
  `,
})
export class ChartCardComponent {
  title = input.required<string>();
  subtitle = input<string>('');
}
