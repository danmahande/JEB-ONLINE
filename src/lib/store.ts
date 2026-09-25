"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./types";

interface CartState {
  lines: CartLine[];
  hasHydrated: boolean;
  addLine: (line: CartLine) => void;
  removeLine: (productId: string, variantLabel: string) => void;
  setQty: (productId: string, variantLabel: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hasHydrated: false,
      addLine: (line) =>
        set((s) => {
          const idx = s.lines.findIndex(
            (l) => l.productId === line.productId && l.variantLabel === line.variantLabel
          );
          if (idx >= 0) {
            const lines = [...s.lines];
            const merged = { ...lines[idx] };
            merged.qty = Math.min(merged.qty + line.qty, merged.maxStock);
            lines[idx] = merged;
            return { lines };
          }
          return { lines: [...s.lines, line] };
        }),
      removeLine: (productId, variantLabel) =>
        set((s) => ({
          lines: s.lines.filter(
            (l) => !(l.productId === productId && l.variantLabel === variantLabel)
          ),
        })),
      setQty: (productId, variantLabel, qty) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.productId === productId && l.variantLabel === variantLabel
              ? { ...l, qty: Math.max(1, Math.min(qty, l.maxStock)) }
              : l
          ),
        })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "meridian-cart",
      // hasHydrated flips in a root useEffect (src/app/page.tsx) — zustand
      // v5's persist never fires onRehydrateStorage's callback here, and a
      // flag persisted as false would otherwise stay false forever.
    }
  )
);

interface RegionState {
  region: string;
  hasHydrated: boolean;
  setRegion: (r: string) => void;
}

export const useRegion = create<RegionState>()(
  persist(
    (set) => ({
      region: "UG",
      hasHydrated: false,
      setRegion: (region) => set({ region }),
    }),
    {
      name: "meridian-region",
      // hasHydrated flips in a root useEffect (src/app/page.tsx) — see cart
      // store note above.
    }
  )
);

/* ── Living sky ──────────────────────────────────────────────────────────── */

export type DayPart = "dawn" | "day" | "golden" | "night";

interface SkyState {
  /** computed from the visitor's local clock (see use-daypart.ts) */
  natural: DayPart;
  /** footer "VIEW AT DUSK" style override — null = follow the real clock */
  override: DayPart | null;
  setNatural: (d: DayPart) => void;
  setOverride: (d: DayPart | null) => void;
}

export const useSky = create<SkyState>()((set) => ({
  natural: "day",
  override: null,
  setNatural: (natural) => set({ natural }),
  setOverride: (override) => set({ override }),
}));

/* ── Fly-to-cart flight ──────────────────────────────────────────────────── */

interface FlyState {
  /** viewport coords of the control that fired the add + a remount key */
  fly: { x: number; y: number; key: number } | null;
  flyTo: (x: number, y: number) => void;
  clearFly: () => void;
}

export const useFly = create<FlyState>()((set) => ({
  fly: null,
  flyTo: (x, y) => set({ fly: { x, y, key: Date.now() } }),
  clearFly: () => set({ fly: null }),
}));
