"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-in reveal — children fade-rise once when the block enters the viewport.
 *
 * Uses the shared `.ms-view-in` primitive (globals.css), which is already
 * withdrawn under `prefers-reduced-motion: reduce`. This component previously
 * emitted two class names that had no base CSS rule outside the reduced-motion
 * block, so the reveal silently did nothing.
 *
 * Content is visible in every state: the animation only ever runs when the
 * block is already in view, so no block can be left invisible if the observer
 * never fires (which is also why there is no hidden initial state to hydrate).
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // no IntersectionObserver -> reveal next frame (async: hydration-safe, lint-clean)
    if (!el || typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={[inView ? "ms-view-in" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
