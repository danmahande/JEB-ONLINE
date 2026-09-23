"use client";

import { useEffect } from "react";
import { useSky, type DayPart } from "./store";

function dayPartNow(): DayPart {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 19) return "golden";
  return "night";
}

/**
 * Keeps the natural day-part fresh in the sky store (re-checks every minute).
 * Mount ONCE at page level. SSR + first client render stay "day" — the real
 * part lands after mount, so hydration can never mismatch (Task 20 lesson).
 */
export function useDaypartTicker() {
  const setNatural = useSky((s) => s.setNatural);
  useEffect(() => {
    const compute = () => setNatural(dayPartNow());
    compute();
    const iv = setInterval(compute, 60_000);
    return () => clearInterval(iv);
  }, [setNatural]);
}
