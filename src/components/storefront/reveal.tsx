"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-in reveal — children fade-rise once when the block enters the viewport.
 * Degrades to always-visible (no observer / reduced motion handled in CSS).
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
  // no IntersectionObserver -> start revealed (no effect needed)
  const supported = typeof IntersectionObserver !== "undefined";
  const [inView, setInView] = useState(!supported);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supported) return;
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
  }, [supported]);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`ms-reveal ${inView ? "ms-reveal-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
