"use client";

import { useEffect } from "react";
import { useFly } from "@/lib/store";

/**
 * Arcs a small brand dot from the ADD button (store coordinates) to the cart
 * badge (queried live). Imperative on purpose: a DOM dot animated with WAAPI
 * costs zero React renders. Rendered once at page level. Reduced-motion and
 * missing badges short-circuit — the badge pop still lands as the payoff.
 */
export default function FlyDot() {
  const fly = useFly((s) => s.fly);
  const clearFly = useFly((s) => s.clearFly);

  useEffect(() => {
    if (!fly) return;
    const badge = document.querySelector("[data-cart-badge]");
    if (!badge) {
      clearFly();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clearFly();
      return;
    }

    const dot = document.createElement("div");
    dot.className = "ms-fly-dot";
    document.body.appendChild(dot);

    const to = badge.getBoundingClientRect();
    const x1 = fly.x - 5;
    const y1 = fly.y - 5;
    const x2 = to.left + to.width / 2 - 5;
    const y2 = to.top + to.height / 2 - 5;
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 90;

    const anim = dot.animate(
      [
        { transform: `translate3d(${x1}px, ${y1}px, 0) scale(1)`, opacity: 1 },
        { transform: `translate3d(${mx}px, ${my}px, 0) scale(0.8)`, opacity: 1, offset: 0.55 },
        { transform: `translate3d(${x2}px, ${y2}px, 0) scale(0.35)`, opacity: 0.85 },
      ],
      { duration: 680, easing: "cubic-bezier(.3,.7,.3,1)" }
    );

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dot.remove();
      clearFly();
    };
    anim.onfinish = finish;
    anim.oncancel = finish;
    return () => {
      if (!done) {
        done = true;
        dot.remove();
      }
    };
  }, [fly, clearFly]);

  return null;
}
