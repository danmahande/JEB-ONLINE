"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart, useRegion } from "@/lib/store";
import { fmt, quoteCart, fmtWeight } from "@/lib/format";
import { levyTag } from "@/lib/levies";
import { useCountUp } from "@/lib/use-count-up";
import { Button } from "@/components/ui/button";
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
  const cart = useCart((s) => s);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const removeLine = useCart((s) => s.removeLine);
  const active = regions.find((r) => r.region === region);
  const q = active ? quoteCart(lines, active) : null;
  const subtotal = useCountUp(q ? q.subtotal : 0);
  const total = useCountUp(q ? q.total : 0);
  const regionHasHydrated = useRegion((s) => s.hasHydrated);
  
  // Add loading state for checkout
  const [isProcessing, setIsProcessing] = useState(false);

  const totalFmt = (usd: number) =>
    active && regionHasHydrated ? fmt(usd, active) : `$${usd.toFixed(2)}`;
  
  // Calculate levies for empty cart check
  const hasItems = lines.length > 0;

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
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-6 text-hush">Your cart is empty</p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="ms-label px-6 py-3"
            >
              CONTINUE SHOPPING
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto ms-scroll divide-y divide-line">
              {lines.map((l) => (
                <div key={`${l.productId}-${l.variantLabel}`} className="flex gap-4 p-4 border-b border-line">
                  <div className="relative w-20 h-20 shrink-0 border border-line overflow-hidden">
                    <Image
                      src={l.image || "/products/placeholder.png"}
                      alt={l.productLabel}
                      fill
                      sizes="80px"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{l.productLabel}</p>
                        <p className="ms-label text-hush text-sm mt-0.5">{l.variantLabel}</p>
                      </div>
                      <button
                        onClick={() => removeLine(l.productId, l.variantLabel)}
                        className="ms-label text-hush hover:text-red-500 opacity-60 hover:opacity-100"
                        aria-label={`Remove ${l.productLabel}`}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => setQty(l.productId, l.variantLabel, Math.max(1, l.qty - 1))}
                        className="ms-label size-8 flex-shrink-0 rounded border border-line"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="ms-label w-8 text-center">{l.qty}</span>
                      <button
                        onClick={() => setQty(l.productId, l.variantLabel, l.qty + 1)}
                        className="ms-label size-8 flex-shrink-0 rounded border border-line"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <span className="ms-price text-sm ml-auto">
                        {totalFmt(l.unitPriceUsd * l.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {active && q && (
              <div className="border-t border-line p-4 space-y-2">
                <p className="ms-label text-hush">
                  SHIP TO {active.countryName} · {fmtWeight(q.totalWeightKg)} · ETA {active.etaDays}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-hush">SUBTOTAL</span>
                  <span className="font-bold">{totalFmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-hush">
                    IMPORT DUTY ({Math.round(active.dutyRate * 100)}%)
                  </span>
                  <span className="font-bold">{totalFmt(q.duty)}</span>
                </div>
                {q && q.levies.length > 0 && active && (
                  <div className="flex justify-between text-sm">
                    <span className="text-hush">LEVIES ({levyTag(active.region)})</span>
                    <span className="font-bold">{totalFmt(q.leviesTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-hush">VAT ({Math.round(active.vatRate * 100)}%)</span>
                  <span className="font-bold">{totalFmt(q.vat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-hush">FREIGHT</span>
                  <span className="font-bold">{totalFmt(q.shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 mt-3 font-bold">
                  <span>TOTAL</span>
                  <span className="ms-price text-xl text-brand">{totalFmt(total)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="ms-label px-4 py-3"
                  >
                    CONTINUE SHOPPING
                  </Button>
                  <Button
                    className="ms-label ms-key px-4 py-3 flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsProcessing(true);
                      // Simulate processing delay
                      setTimeout(() => {
                        onCheckout();
                      }, 500);
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        PROCESSING...
                      </>
                    ) : (
                      `CHECKOUT (${totalFmt(total)})`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
