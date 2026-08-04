import { Directive } from '@angular/core';

@Directive({
  selector: 'textarea[appTextarea]',
  standalone: true,
  host: {
    class:
      'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
  },
})
export class TextareaDirective {}
