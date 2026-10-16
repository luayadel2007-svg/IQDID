import { useLayoutEffect, useRef, type RefObject } from 'react';

const reducedMotion = (): boolean =>
  document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/**
 * FLIP: after a re-order, every `[data-flip]` child animates from its previous position with a
 * transform only (no layout thrash), 320 ms. Skipped entirely under reduced motion.
 */
export function useFlip(container: RefObject<HTMLElement | null>, deps: readonly unknown[]): void {
  const prev = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const els = [...(container.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])];
    const next = new Map<string, number>();
    const reduce = reducedMotion();
    for (const el of els) {
      const key = el.dataset.flip ?? '';
      const top = el.getBoundingClientRect().top + window.scrollY;
      next.set(key, top);
      const before = prev.current.get(key);
      if (!reduce && before !== undefined && Math.abs(before - top) > 1 && typeof el.animate === 'function') {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    prev.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
