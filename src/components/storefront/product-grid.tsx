"use client";

import { useState } from "react";
import type { Product, RegionConfig } from "@/lib/types";
import { fmt } from "@/lib/format";
import { useCart } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const TABS = [
  { key: "ALL", label: "ALL" },
  { key: "GRAINS", label: "GRAINS" },
  { key: "HARDWARE", label: "HARDWARE" },
];

export default function ProductGrid({
  products,
  regions,
  region,
  onSelect,
  loading,
  query,
  onClearQuery,
}: {
  products: Product[];
  regions: RegionConfig[];
  region: string;
  onSelect: (p: Product) => void;
  loading: boolean;
  query: string;
  onClearQuery: () => void;
}) {
  const [tab, setTab] = useState("ALL");
  const addLine = useCart((s) => s.addLine);
  const { toast } = useToast();
  const active = regions.find((r) => r.region === region);

  const q = query.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (tab !== "ALL" && p.category !== tab) return false;
    if (!q) return true;
    return (
      p.productLabel.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  // show the base/default variant price (closest to 0 delta), not the smallest pack
  function defaultVariant(p: Product) {
    return (
      [...p.variants].sort((a, b) => Math.abs(a.priceDelta) - Math.abs(b.priceDelta))[0] ||
      p.variants[0]
    );
  }

  function quickAdd(p: Product) {
    const v = defaultVariant(p);
    if (!v || p.currentStock <= 0) return;
    addLine({
      productId: p.productId,
      slug: p.slug,
      productLabel: p.productLabel,
      brand: p.brand,
      variantLabel: v.label,
      unitPriceUsd: p.unitSellingPrice + (v?.priceDelta || 0),
      weightKg: v.weightKg,
      qty: 1,
      image: p.image,
      maxStock: p.currentStock,
    });
    toast({
      title: "ADDED TO CART",
      description: `${p.productLabel} (${v.label.toLowerCase()}) — open the cart to check out.`,
    });
  }

  return (
    <section
      id="catalog"
      className="bg-[linear-gradient(to_bottom,#FBF6EC_0px,#F8FAFC_360px)] px-4 md:px-8 py-10 md:py-14"
      aria-label="Catalog"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h2 className="ms-display text-4xl md:text-6xl">
          CATALOG
          <sup className="text-sm md:text-base align-super ml-2 text-brand">
            {String(filtered.length).padStart(2, "0")}
          </sup>
        </h2>
        <div className="flex border border-line bg-white" role="tablist" aria-label="Category filter">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`ms-label px-4 md:px-6 py-3 border-r border-line last:border-r-0 transition-colors ${
                tab === t.key ? "bg-brand text-white" : "hover:bg-ink hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <p className="text-sm text-hush">
            Showing <span className="font-bold text-ink">{filtered.length}</span> result
            {filtered.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
          </p>
          <button
            onClick={onClearQuery}
            className="ms-label border border-line bg-white px-3 py-1.5 hover:bg-ink hover:text-white transition-colors"
          >
            CLEAR ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-line bg-white px-6 py-16 text-center">
          <p className="font-bold text-lg mb-2">No products match &ldquo;{query.trim()}&rdquo;.</p>
          <p className="text-sm text-hush mb-6">
            Try &ldquo;maize&rdquo;, &ldquo;cement&rdquo; or &ldquo;nails&rdquo; — or browse the full catalog.
          </p>
          <button
            onClick={onClearQuery}
            className="ms-label bg-brand text-white px-6 py-3 hover:bg-brand-dark transition-colors"
          >
            SHOW EVERYTHING
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p) => {
            const v = defaultVariant(p);
            const priceUsd = p.unitSellingPrice + (v?.priceDelta || 0);
            const out = p.currentStock <= 0;
            const low = !out && p.currentStock <= 50;
            return (
              <div
                key={p.productId}
                className={`ms-tile group relative flex flex-col border border-line overflow-hidden bg-white shadow-sm ${
                  out ? "ms-oos" : ""
                }`}
              >
                <button
                  onClick={() => onSelect(p)}
                  className="relative block w-full text-left"
                  aria-label={`View ${p.productLabel}`}
                >
                  <div className="aspect-square overflow-hidden bg-neutral-100">
                    <img
                      src={p.image || "/products/placeholder.png"}
                      alt={p.productLabel}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>

                {/* badges */}
                <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none">
                  <span className="ms-label rounded bg-white border border-line px-2 py-1 text-ink">
                    {p.category}
                  </span>
                  {active?.isEac && (
                    <span className="ms-label rounded bg-emerald-500 text-white px-2 py-1">
                      0% DUTY
                    </span>
                  )}
                </div>
                {out && (
                  <span className="ms-label rounded absolute top-2 right-2 bg-red-500 text-white px-2 py-1">
                    SOLD OUT
                  </span>
                )}

                {/* info panel */}
                <div className="flex flex-col gap-1.5 flex-1 p-3 md:p-4">
                  <p className="ms-label text-hush truncate">
                    {p.brand} · {v?.label || p.weight || p.unit}
                  </p>
                  <button
                    onClick={() => onSelect(p)}
                    className="text-left font-bold text-sm md:text-[15px] leading-snug line-clamp-2 hover:text-brand transition-colors"
                    title={p.productLabel}
                  >
                    {p.productLabel}
                  </button>
                  <p
                    className={`text-xs font-semibold ${
                      out ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600"
                    }`}
                  >
                    {out
                      ? "Sold out — more arriving soon"
                      : low
                        ? `Only ${p.currentStock} left in stock`
                        : `In stock — ${p.currentStock} ${p.unit.toLowerCase()}${p.currentStock === 1 ? "" : "s"}`}
                  </p>
                  <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
                    <span className="font-black text-lg md:text-xl tracking-tight text-brand leading-none whitespace-nowrap">
                      {active ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`}
                    </span>
                    <button
                      onClick={() => quickAdd(p)}
                      disabled={out}
                      className="ms-label bg-brand text-white px-3 py-2.5 hover:bg-brand-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      aria-label={`Add ${p.productLabel} to cart`}
                    >
                      {out ? "—" : "ADD"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
