"use client";

import { fmt } from "@/lib/format";
import { useRegion } from "@/lib/store";
import type { PlacedOrder, RegionConfig } from "@/lib/types";

export default function Confirmation({
  order,
  regions,
  onContinue,
  onTrack,
}: {
  order: PlacedOrder;
  regions: RegionConfig[];
  onContinue: () => void;
  onTrack: () => void;
}) {
  const active = regions.find((r) => r.region === order.region);
  const regionHasHydrated = useRegion((s) => s.hasHydrated);
  const local = active && regionHasHydrated ? fmt(order.totalAmount, active) : `$${order.totalAmount.toFixed(2)}`;

  return (
    <section className="px-4 md:px-8 py-10 md:py-14" aria-label="Order confirmation">
      {/* toolbar module — same control rail as the catalog/checkout, not a magazine headline */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8 rounded-lg border border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
        <h2 className="ms-display text-2xl md:text-3xl leading-none tracking-tight">
          ORDER CONFIRMED
        </h2>
        <p className="ms-label text-hush">NO. {order.orderNumber}</p>
      </div>

      <div className="max-w-xl">
        <div className="rounded-lg border border-line bg-white text-left">
          <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
            <div className="p-4">
              <p className="ms-label text-hush mb-1">ORDER NO.</p>
              <p className="ms-price text-lg">{order.orderNumber}</p>
            </div>
            <div className="p-4">
              <p className="ms-label text-hush mb-1">TRACKING NO.</p>
              <p className="ms-price text-lg break-all">{order.trackingNumber}</p>
            </div>
          </div>

          <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-b border-line">
            <p><span className="text-hush">DESTINATION:</span> <b>{order.destination}</b></p>
            <p><span className="text-hush">ETA:</span> <b>{order.etaDays}</b></p>
            <p><span className="text-hush">PAYMENT:</span> <b>{order.paymentMethod}</b></p>
            <p><span className="text-hush">TOTAL DUE:</span> <b>{local}</b> <span className="text-hush">(${order.totalAmount.toFixed(2)})</span></p>
          </div>

          <div className="p-4 space-y-1.5 text-sm">
            <p className="ms-label text-hush mb-2">COST BREAKDOWN (USD)</p>
            <div className="flex justify-between"><span className="text-hush">SUBTOTAL</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-hush">IMPORT DUTY</span><span>${order.dutyAmount.toFixed(2)}</span></div>
            {!!order.leviesAmount && order.leviesAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-hush">
                  BORDER LEVIES{order.levyLines?.length ? ` (${order.levyLines.map((l) => l.code).join(" + ")})` : ""}
                </span>
                <span>${order.leviesAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-hush">VAT</span><span>${order.vatAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-hush">FREIGHT</span><span>${order.shippingAmount.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 items-baseline">
              <span className="ms-label">TOTAL</span>
              <span className="ms-price">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-8">
          <button onClick={onTrack} className="ms-label bg-brand text-white px-8 py-4 hover:bg-brand-dark transition-colors">
            TRACK THIS ORDER →
          </button>
          <button onClick={onContinue} className="ms-label border border-line bg-white px-8 py-4 hover:bg-ink hover:text-white transition-colors">
            CONTINUE SHOPPING
          </button>
        </div>

        <p className="ms-label text-hush mt-6 leading-relaxed">
          YOUR ORDER IS CONFIRMED AS “{order.status.toUpperCase()}” — OUR WAREHOUSE
          TEAM PICKS, PACKS AND DISPATCHES FROM HERE.
        </p>
      </div>
    </section>
  );
}
