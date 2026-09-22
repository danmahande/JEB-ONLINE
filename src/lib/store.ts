"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./types";

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  removeLine: (productId: string, variantLabel: string) => void;
  setQty: (productId: string, variantLabel: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
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
    { name: "meridian-cart" }
  )
);

interface RegionState {
  region: string;
  setRegion: (r: string) => void;
}

export const useRegion = create<RegionState>()(
  persist(
    (set) => ({
      region: "UG",
      setRegion: (region) => set({ region }),
    }),
    { name: "meridian-region" }
  )
);
