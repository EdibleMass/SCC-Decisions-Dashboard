import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Measure a DOM element's size, for charts that need explicit pixel dimensions.
 *
 * The three d3 charts each hand-rolled a ResizeObserver that only set state
 * from the observer callback, which has two consequences:
 *
 *  1. The first paint always ran at 0x0 until the observer delivered, so a
 *     chart could flash empty (or stay empty if the callback never arrived).
 *  2. ResizeObserver delivery is tied to the rendering lifecycle. In an
 *     offscreen or non-painting context the callback may never fire at all,
 *     leaving the chart permanently blank even though the container has a
 *     perfectly good size.
 *
 * This measures synchronously on mount and again after each render, keeping the
 * observer as the mechanism for size changes that don't re-render the parent.
 * The equality guard means the extra measurement cannot loop.
 */
export const useElementSize = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize(prev =>
      Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
        ? prev
        : { width: rect.width, height: rect.height }
    );
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    // One deferred pass catches layout that settles after the commit (fonts,
    // flex reflow) without waiting on the observer.
    const raf = requestAnimationFrame(measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  // Re-measure after every render so a chart that mounts into an already-sized
  // container (tab switch, conditional render) picks up its size immediately.
  useLayoutEffect(() => { measure(); });

  return [ref, size] as const;
};
