"use client";

import { fmt } from "@/lib/format";
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
  const local = active ? fmt(order.totalAmount, active) : `$${order.totalAmount.toFixed(2)}`;

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 min-h-[60vh] flex flex-col items-center justify-center text-center" aria-label="Order confirmation">
      <p className="kz-label opacity-50 mb-4">ORDER CONFIRMED</p>
      <h2 className="kz-display text-5xl md:text-7xl mb-8">SEE YOU<br />AT DELIVERY</h2>

      <div className="w-full max-w-xl border border-black text-left">
        <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
          <div className="p-4">
            <p className="kz-label opacity-50 mb-1">ORDER NO.</p>
            <p className="font-black text-lg">{order.orderNumber}</p>
          </div>
          <div className="p-4">
            <p className="kz-label opacity-50 mb-1">TRACKING NO.</p>
            <p className="font-black text-lg break-all">{order.trackingNumber}</p>
          </div>
        </div>

        <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-b border-black">
          <p><span className="opacity-50">DESTINATION:</span> <b>{order.destination}</b></p>
          <p><span className="opacity-50">ETA:</span> <b>{order.etaDays}</b></p>
          <p><span className="opacity-50">PAYMENT:</span> <b>{order.paymentMethod}</b></p>
          <p><span className="opacity-50">TOTAL DUE:</span> <b>{local}</b> <span className="opacity-40">(${order.totalAmount.toFixed(2)})</span></p>
        </div>

        <div className="p-4 space-y-1.5 text-sm">
          <p className="kz-label opacity-50 mb-2">COST BREAKDOWN (USD)</p>
          <div className="flex justify-between"><span className="opacity-60">SUBTOTAL</span><span>${order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="opacity-60">IMPORT DUTY</span><span>${order.dutyAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="opacity-60">VAT</span><span>${order.vatAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="opacity-60">FREIGHT</span><span>${order.shippingAmount.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-black pt-2 font-black"><span>TOTAL</span><span>${order.totalAmount.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-8">
        <button onClick={onTrack} className="kz-label bg-black text-white px-8 py-4 hover:opacity-80 transition-opacity">
          TRACK THIS ORDER →
        </button>
        <button onClick={onContinue} className="kz-label border border-black px-8 py-4 hover:bg-black hover:text-white transition-colors">
          CONTINUE SHOPPING
        </button>
      </div>

      <p className="kz-label opacity-40 mt-6 max-w-md leading-relaxed">
        YOUR ORDER IS NOW IN KWANZA-ERP AS “{order.status.toUpperCase()}” — THE WAREHOUSE
        TEAM PICKS, PACKS AND GENERATES THE RUNSHEET FROM HERE.
      </p>
    </section>
  );
}
