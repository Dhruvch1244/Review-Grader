import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  success(message: string) {
    this.push(message, 'success');
  }
  error(message: string) {
    this.push(message, 'error');
  }
  info(message: string) {
    this.push(message, 'info');
  }

  private push(message: string, variant: ToastItem['variant']) {
    const id = nextId++;
    this.toasts.update((list) => [...list, { id, message, variant }]);
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
