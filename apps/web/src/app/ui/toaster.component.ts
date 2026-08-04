import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { cn } from './utils';

@Component({
  selector: 'app-toaster',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      @for (t of toasts.toasts(); track t.id) {
        <div [class]="classFor(t.variant)" (click)="toasts.dismiss(t.id)">
          {{ t.message }}
        </div>
      }
    </div>
  `,
})
export class ToasterComponent {
  toasts = inject(ToastService);

  classFor(variant: 'success' | 'error' | 'info') {
    return cn(
      'cursor-pointer rounded-lg border px-3.5 py-2.5 text-sm shadow-md ring-1 ring-foreground/10 bg-card text-card-foreground',
      variant === 'success' && 'border-l-4 border-l-emerald-500',
      variant === 'error' && 'border-l-4 border-l-destructive',
      variant === 'info' && 'border-l-4 border-l-primary'
    );
  }
}
