"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product, RegionConfig } from "@/lib/types";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // attempt bumps on retry() — the effect re-runs and refetches both feeds
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const [pRes, fRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/fx"),
        ]);
        // surface clean reasons first — a non-JSON error page from either
        // feed would otherwise die as a cryptic json-parse message
        if (!pRes.ok) throw new Error(`stock feed responded ${pRes.status}`);
        if (!fRes.ok) throw new Error(`trade feed responded ${fRes.status}`);
        const pData = await pRes.json();
        const fData = await fRes.json();
        if (!alive) return;
        if (!pData.success) throw new Error(pData.error || "Failed to load catalog");
        // a dead FX feed is equally fatal: without region configs the
        // region selector, currency conversion and checkout all mislead
        if (!fData.success) throw new Error(fData.error || "Failed to load trade config");
        setProducts(pData.products);
        setRegions(fData.regions || []);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load catalog");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { products, regions, loading, error, retry };
}
