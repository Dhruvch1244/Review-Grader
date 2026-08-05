import { Directive, ElementRef, HostListener, Renderer2, inject, input } from '@angular/core';

/**
 * Minimal replacement for the base-ui Tooltip (which used a floating
 * positioner + portal). No positioning library - just a fixed-position
 * span placed above the host on hover/focus via getBoundingClientRect,
 * removed on leave. Covers every actual use in this app (a short label
 * on an icon button), which never needed floating-ui's edge-avoidance.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective {
  appTooltip = input<string>('', { alias: 'appTooltip' });

  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private tooltipEl: HTMLElement | null = null;

  @HostListener('mouseenter')
  @HostListener('focus')
  show() {
    const text = this.appTooltip();
    if (!text || this.tooltipEl) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const tip = this.renderer.createElement('span') as HTMLElement;
    this.renderer.appendChild(tip, this.renderer.createText(text));
    this.renderer.setAttribute(
      tip,
      'class',
      'fixed z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background pointer-events-none'
    );
    this.renderer.setStyle(tip, 'left', `${rect.left + rect.width / 2}px`);
    this.renderer.setStyle(tip, 'top', `${rect.top - 8}px`);
    this.renderer.setStyle(tip, 'transform', 'translate(-50%, -100%)');
    this.renderer.appendChild(document.body, tip);
    this.tooltipEl = tip;
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  hide() {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
