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
  // keyed by product so variant/qty state resets naturally when product changes
  const [variantIdx, setVariantIdx] = useState(0);
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
      <DialogContent key={product.productId} className="max-w-4xl p-0 gap-0 bg-white border border-black rounded-none max-h-[90vh] overflow-y-auto kz-scroll">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.productLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2">
          {/* image */}
          <div className="relative aspect-square bg-neutral-100 border-b md:border-b-0 md:border-r border-black">
            { }
            <img
              src={product.image || "/products/placeholder.png"}
              alt={product.productLabel}
              className="w-full h-full object-cover"
            />
            <span className="kz-label absolute top-3 left-3 bg-white border border-black px-2 py-1">
              HS {product.hsCode} · ORIGIN {product.originCountry}
            </span>
          </div>

          {/* details */}
          <div className="p-5 md:p-8 flex flex-col">
            <p className="kz-label opacity-60 mb-2">
              {product.brand} · {product.productId}
            </p>
            <h3 className="kz-display text-3xl md:text-4xl mb-4">{product.productLabel}</h3>

            <p className="text-sm leading-relaxed mb-6 opacity-80">
              {product.description}
            </p>

            {/* variants */}
            {product.variants.length > 1 && (
              <div className="mb-5">
                <p className="kz-label mb-2 opacity-60">SELECT PACK</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((pv, i) => (
                    <button
                      key={pv.label}
                      onClick={() => setVariantIdx(i)}
                      className={`kz-label border border-black px-3 py-2 transition-colors ${
                        i === variantIdx
                          ? "bg-black text-white"
                          : "hover:bg-black hover:text-white"
                      }`}
                    >
                      {pv.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* price + stock */}
            <div className="flex items-baseline justify-between border-t border-black pt-4 mt-auto">
              <div>
                <p className="kz-label opacity-60 mb-1">UNIT PRICE</p>
                <p className="font-black text-2xl md:text-3xl tracking-tight">
                  {active ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`}
                </p>
              </div>
              <p className="kz-label text-right">
                {out ? (
                  <span className="text-red-600">SOLD OUT</span>
                ) : (
                  <>
                    {product.currentStock} {product.unit}(S) IN STOCK
                  </>
                )}
              </p>
            </div>

            {/* qty + add */}
            <div className="flex gap-2 mt-5">
              <div className="flex border border-black">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="kz-label px-4 hover:bg-black hover:text-white transition-colors"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span
                  className="kz-label px-4 py-3 border-x border-black min-w-[3.5rem] text-center"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(product.currentStock, q + 1))}
                  className="kz-label px-4 hover:bg-black hover:text-white transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={out}
                className="kz-label flex-1 bg-black text-white px-6 py-3 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                {out ? "UNAVAILABLE" : "ADD TO CART"}
              </button>
            </div>

            <p className="kz-label mt-4 opacity-50">
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
