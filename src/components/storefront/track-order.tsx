"use client";

import { useState } from "react";
import { ORDER_STAGES, type OrderEvent, type OrderLine, type TrackedOrder } from "@/lib/types";

export default function TrackOrder() {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [lineItems, setLineItems] = useState<OrderLine[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "notfound" | "found" | "error">("idle");

  async function lookup() {
    const q = query.trim();
    if (!q) return;
    setState("loading");
    try {
      const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setState("notfound");
        setOrder(null);
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOrder(data.order);
      setLineItems(data.lineItems);
      setEvents(data.events);
      setState("found");
    } catch {
      setState("error");
    }
  }

  const stageIdx = (() => {
    if (!order) return -1;
    if (order.status === "returned") return 0;
    const i = ORDER_STAGES.findIndex((s) => s.key === order.status);
    return i >= 0 ? i : 0;
  })();

  return (
    <section className="px-4 md:px-8 py-10 md:py-14 min-h-[60vh]" aria-label="Track order">
      <h2 className="kz-display text-4xl md:text-6xl mb-8">TRACK ORDER</h2>

      <div className="max-w-2xl">
        <div className="flex border border-black">
          <input
            className="kz-field border-0"
            placeholder="ORDER NO. (E.G. DS100001) OR TRACKING NO."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            aria-label="Order number"
          />
          <button
            onClick={lookup}
            className="kz-label bg-black text-white px-6 md:px-10 hover:opacity-80 transition-opacity"
          >
            {state === "loading" ? "…" : "FIND"}
          </button>
        </div>

        {state === "notfound" && (
          <p className="kz-label mt-4 border border-black px-4 py-3" role="status">
            NO ORDER FOUND FOR “{query.toUpperCase()}”. CHECK THE NUMBER OR CONTACT SALES.
          </p>
        )}
        {state === "error" && (
          <p className="kz-label mt-4 border border-black px-4 py-3" role="alert">
            LOOKUP FAILED — TRY AGAIN.
          </p>
        )}

        {state === "found" && order && (
          <div className="mt-8 border border-black">
            {/* header */}
            <div className="flex flex-wrap justify-between gap-4 p-5 border-b border-black bg-black text-white">
              <div>
                <p className="kz-label opacity-60 mb-1">ORDER</p>
                <p className="font-black text-2xl tracking-tight">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="kz-label opacity-60 mb-1">TRACKING</p>
                <p className="font-black text-lg">{order.trackingNumber || "—"}</p>
              </div>
            </div>

            {/* timeline */}
            <div className="p-5 border-b border-black">
              <div className="relative">
                <span
                  className="absolute top-[7px] left-0 right-0 h-0.5 bg-black opacity-10"
                  aria-hidden="true"
                />
                <span
                  className="absolute top-[7px] left-0 h-0.5 bg-black"
                  style={{
                    width: order.status === "returned" ? "0%" : `${(stageIdx / (ORDER_STAGES.length - 1)) * 100}%`,
                  }}
                  aria-hidden="true"
                />
                <div className="relative flex justify-between">
                  {ORDER_STAGES.map((s, i) => {
                    const reached = i <= stageIdx && order.status !== "returned";
                    return (
                      <div
                        key={s.key}
                        className="flex flex-col items-center text-center gap-2 w-16 sm:w-24"
                      >
                        <span
                          className={`w-4 h-4 ${
                            reached ? "bg-black" : "bg-white border border-black"
                          }`}
                          aria-hidden="true"
                        />
                        <span className={`kz-label ${reached ? "" : "opacity-30"}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {order.status === "returned" && (
                <p className="kz-label mt-6 text-center text-red-600">ORDER RETURNED</p>
              )}
            </div>

            {/* meta */}
            <div className="grid sm:grid-cols-2 divide-black sm:divide-x border-b border-black">
              <div className="p-5 space-y-1.5">
                <p className="kz-label opacity-50 mb-2">SHIPMENT</p>
                <p className="text-sm"><b>DESTINATION:</b> {order.destination || "—"}</p>
                <p className="text-sm"><b>PLACED:</b> {new Date(order.orderDate).toLocaleDateString()}</p>
                <p className="text-sm"><b>ETA:</b> {order.etaDays || "—"}</p>
              </div>
              <div className="p-5 space-y-1.5">
                <p className="kz-label opacity-50 mb-2">PAYMENT</p>
                <p className="text-sm"><b>METHOD:</b> {order.paymentMethod}</p>
                <p className="text-sm">
                  <b>TOTAL:</b> ${order.totalAmount.toFixed(2)}
                  {order.currency !== "USD" && (
                    <span className="opacity-50">
                      {" "}
                      (≈ {order.currency}{" "}
                      {Math.round(order.totalAmount * (order as any).fxRate).toLocaleString()})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* items */}
            <div className="p-5 border-b border-black">
              <p className="kz-label opacity-50 mb-3">ITEMS</p>
              <div className="divide-y divide-black">
                {lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <b className="uppercase">{li.productName}</b>
                      <span className="opacity-50">
                        {" "}
                        · {li.variant} × {li.qty}
                      </span>
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      ${li.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* events */}
            {events.length > 0 && (
              <div className="p-5">
                <p className="kz-label opacity-50 mb-3">HISTORY</p>
                <ul className="space-y-2">
                  {events.map((ev) => (
                    <li key={ev.id} className="text-xs tracking-wide">
                      <span className="opacity-40">
                        {new Date(ev.createdAt).toLocaleString()} —{" "}
                      </span>
                      {ev.note || `${ev.fromStatus} → ${ev.toStatus}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
