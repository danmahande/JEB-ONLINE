"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/store";
import { fmt, quoteCart, fmtWeight } from "@/lib/format";
import type { RegionConfig } from "@/lib/types";

export default function CartDrawer({
  open,
  regions,
  region,
  onOpenChange,
  onCheckout,
}: {
  open: boolean;
  regions: RegionConfig[];
  region: string;
  onOpenChange: (o: boolean) => void;
  onCheckout: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const removeLine = useCart((s) => s.removeLine);
  const active = regions.find((r) => r.region === region);
  const q = active ? quoteCart(lines, active) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 rounded-lg border-l border-line bg-white flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-line">
          <SheetTitle className="ms-display text-2xl text-ink">
            CART [{lines.reduce((s, l) => s + l.qty, 0)}]
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="ms-display text-2xl opacity-30">EMPTY</p>
            <p className="ms-label text-hush">ADD GRAINS OR HARDWARE TO CONTINUE</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto ms-scroll divide-y divide-line">
              {lines.map((l) => (
                <div key={`${l.productId}-${l.variantLabel}`} className="flex gap-3 p-4">
                  <div className="w-20 h-20 shrink-0 border border-line overflow-hidden">
                    { }
                    <img
                      src={l.image || "/products/placeholder.png"}
                      alt={l.productLabel}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm uppercase leading-tight truncate">
                      {l.productLabel}
                    </p>
                    <p className="ms-label text-hush mt-0.5">{l.variantLabel}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex border border-line">
                        <button
                          onClick={() => setQty(l.productId, l.variantLabel, l.qty - 1)}
                          className="ms-label px-2.5 py-1 hover:bg-ink hover:text-white"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="ms-label px-2.5 py-1 border-x border-line">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.productId, l.variantLabel, l.qty + 1)}
                          className="ms-label px-2.5 py-1 hover:bg-ink hover:text-white"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-black text-sm">
                        {active ? fmt(l.unitPriceUsd * l.qty, active) : `$${(l.unitPriceUsd * l.qty).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeLine(l.productId, l.variantLabel)}
                    className="ms-label self-start opacity-40 hover:opacity-100 hover:text-red-500"
                    aria-label={`Remove ${l.productLabel}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {active && q && (
              <div className="border-t border-line p-4 space-y-2">
                <p className="ms-label text-hush">
                  SHIP TO {active.countryName} · {fmtWeight(q.totalWeightKg)} · ETA {active.etaDays}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">SUBTOTAL</span>
                  <span className="font-bold">{fmt(q.subtotal, active)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">
                    IMPORT DUTY ({Math.round(active.dutyRate * 100)}%)
                  </span>
                  <span className="font-bold">{fmt(q.duty, active)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">VAT ({Math.round(active.vatRate * 100)}%)</span>
                  <span className="font-bold">{fmt(q.vat, active)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">FREIGHT</span>
                  <span className="font-bold">{fmt(q.shipping, active)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 mt-3">
                  <span className="ms-label">TOTAL</span>
                  <span className="font-black text-xl">{fmt(q.total, active)}</span>
                </div>
                <button
                  onClick={onCheckout}
                  className="ms-label w-full bg-brand text-white py-4 mt-2 hover:bg-brand-dark transition-colors"
                >
                  CHECKOUT →
                </button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
