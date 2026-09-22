"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart, useRegion } from "@/lib/store";
import { fmt } from "@/lib/format";
import type { Product, RegionConfig } from "@/lib/types";

export default function QuickView({
  product,
  regions,
  onClose,
  onAdded,
}: {
  product: Product | null;
  regions: RegionConfig[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const region = useRegion((s) => s.region);
  const active = regions.find((r) => r.region === region);
  // open on the BASE pack (closest to 0 delta) — the one the tile advertises
  const [variantIdx, setVariantIdx] = useState(() => {
    if (!product?.variants?.length) return 0;
    let best = 0;
    let bestAbs = Infinity;
    product.variants.forEach((pv, i) => {
      const a = Math.abs(pv.priceDelta);
      if (a < bestAbs) {
        bestAbs = a;
        best = i;
      }
    });
    return best;
  });
  const [qty, setQty] = useState(1);

  const v = useMemo(() => product?.variants?.[variantIdx], [product, variantIdx]);
  if (!product) return null;

  const priceUsd = product.unitSellingPrice + (v?.priceDelta || 0);
  const out = product.currentStock <= 0;

  function handleAdd() {
    if (!product || out || !v) return;
    addLine({
      productId: product.productId,
      slug: product.slug,
      productLabel: product.productLabel,
      brand: product.brand,
      variantLabel: v.label,
      unitPriceUsd: priceUsd,
      weightKg: v.weightKg,
      qty,
      image: product.image,
      maxStock: product.currentStock,
    });
    onAdded();
    onClose();
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent key={product.productId} className="max-w-4xl sm:max-w-4xl p-0 gap-0 bg-white border border-line rounded-lg max-h-[90vh] overflow-y-auto ms-scroll">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.productLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2">
          {/* image */}
          <div className="relative aspect-square bg-slate-100 border-b md:border-b-0 md:border-r border-line">
            { }
            <img
              src={product.image || "/products/placeholder.png"}
              alt={product.productLabel}
              className="w-full h-full object-cover"
            />
            <span className="ms-label absolute top-3 left-3 bg-white border border-line px-2 py-1 text-ink">
              HS {product.hsCode} · ORIGIN {product.originCountry}
            </span>
          </div>

          {/* details */}
          <div className="p-5 md:p-8 flex flex-col">
            <p className="ms-label text-hush mb-2">
              {product.brand} · {product.category}
            </p>
            <h3 className="ms-display text-3xl md:text-4xl mb-4 normal-case">{product.productLabel}</h3>

            <p className="text-sm leading-relaxed mb-6 opacity-80">
              {product.description}
            </p>

            {/* variants */}
            {product.variants.length > 1 && (
              <div className="mb-5">
                <p className="ms-label mb-2 text-hush">SELECT PACK</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((pv, i) => (
                    <button
                      key={pv.label}
                      onClick={() => setVariantIdx(i)}
                      className={`ms-weight-toggle ${i === variantIdx ? "is-on" : ""}`}
                    >
                      {pv.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* price + stock */}
            <div className="flex items-baseline justify-between border-t border-line pt-4 mt-auto">
              <div>
                <p className="ms-label text-hush mb-1">UNIT PRICE</p>
                <p className="font-black text-2xl md:text-3xl tracking-tight text-brand">
                  {active ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`}
                </p>
              </div>
              <p className="ms-label text-right">
                {out ? (
                  <span className="text-red-500">SOLD OUT</span>
                ) : (
                  <>
                    {product.currentStock} {product.unit}(S) IN STOCK
                  </>
                )}
              </p>
            </div>

            {/* qty + add */}
            <div className="flex gap-2 mt-5">
              <div className="flex border border-line">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="ms-label px-4 hover:bg-ink hover:text-white transition-colors"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span
                  className="ms-label px-4 py-3 border-x border-line min-w-[3.5rem] text-center"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(product.currentStock, q + 1))}
                  className="ms-label px-4 hover:bg-ink hover:text-white transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={out}
                className="ms-label flex-1 bg-brand text-white px-6 py-3 hover:bg-brand-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {out ? "UNAVAILABLE" : "ADD TO CART"}
              </button>
            </div>

            <p className="ms-label mt-4 text-hush">
              {active?.isEac
                ? "EAC ORIGIN — NO IMPORT DUTY. VAT APPLIES AT CHECKOUT."
                : "INTERNATIONAL ORDERS — DUTY ESTIMATED AT CHECKOUT."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
