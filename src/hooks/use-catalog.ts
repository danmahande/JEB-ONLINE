"use client";

import { useEffect, useState } from "react";
import type { Product, RegionConfig } from "@/lib/types";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [pRes, fRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/fx"),
        ]);
        const pData = await pRes.json();
        const fData = await fRes.json();
        if (!alive) return;
        if (!pData.success) throw new Error(pData.error || "Failed to load catalog");
        setProducts(pData.products);
        setRegions(fData.regions || []);
      } catch (e: any) {
        if (alive) setError(e.message || "Failed to load catalog");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return { products, regions, loading, error };
}
