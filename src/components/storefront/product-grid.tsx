"use client";

import { useState } from "react";
import type { Product, RegionConfig } from "@/lib/types";
import { fmt } from "@/lib/format";

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
}: {
  products: Product[];
  regions: RegionConfig[];
  region: string;
  onSelect: (p: Product) => void;
  loading: boolean;
}) {
  const [tab, setTab] = useState("ALL");
  const active = regions.find((r) => r.region === region);
  const filtered = products.filter((p) => tab === "ALL" || p.category === tab);

  return (
    <section id="catalog" className="px-4 md:px-8 py-10 md:py-14" aria-label="Catalog">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h2 className="kz-display text-4xl md:text-6xl">
          CATALOG
          <sup className="text-sm md:text-base align-super ml-2">
            {String(filtered.length).padStart(2, "0")}
          </sup>
        </h2>
        <div className="flex border border-black" role="tablist" aria-label="Category filter">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`kz-label px-4 md:px-6 py-3 border-r border-black last:border-r-0 transition-colors ${
                tab === t.key ? "bg-black text-white" : "hover:bg-black hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
          {filtered.map((p) => {
            // show the base/default variant price (closest to 0 delta), not the smallest pack
            const v =
              [...p.variants].sort((a, b) => Math.abs(a.priceDelta) - Math.abs(b.priceDelta))[0] ||
              p.variants[0];
            const priceUsd = p.unitSellingPrice + (v?.priceDelta || 0);
            const out = p.currentStock <= 0;
            return (
              <button
                key={p.productId}
                onClick={() => onSelect(p)}
                className={`kz-tile group relative text-left border border-black overflow-hidden bg-white ${
                  out ? "kz-oos" : ""
                }`}
                aria-label={`View ${p.productLabel}`}
              >
                <div className="aspect-square overflow-hidden bg-neutral-100">
                  { }
                  <img
                    src={p.image || "/products/placeholder.png"}
                    alt={p.productLabel}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className="kz-label bg-white border border-black px-2 py-1">
                    {p.category}
                  </span>
                  {active?.isEac && (
                    <span className="kz-label bg-black text-white px-2 py-1">
                      0% DUTY
                    </span>
                  )}
                </div>
                {out && (
                  <span className="kz-label absolute top-2 right-2 bg-black text-white px-2 py-1">
                    SOLD OUT
                  </span>
                )}

                {/* label block */}
                <div className="absolute inset-x-0 bottom-0 bg-black text-white px-3 py-2.5 md:px-4 md:py-3">
                  <p className="kz-label opacity-70 mb-0.5 truncate">
                    {p.brand} · {p.weight || p.unit}
                  </p>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-black text-sm md:text-base uppercase leading-tight tracking-tight truncate">
                      {p.productLabel}
                    </span>
                    <span className="font-black text-sm md:text-base whitespace-nowrap">
                      {active ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
