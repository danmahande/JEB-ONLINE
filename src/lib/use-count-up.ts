"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tweens the displayed number toward `target` (ease-out, default 300ms).
 * Reduced-motion users get an instant snap. The tweened value starts AT the
 * target, so first mounts never animate — only subsequent changes do.
 */
export function useCountUp(target: number, duration = 300): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = target;
      const raf = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(raf);
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return shown;
}
