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
      {/* toolbar module — same control rail as the catalog/checkout */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8 rounded-lg border border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
        <h2 className="ms-display text-2xl md:text-3xl leading-none tracking-tight">TRACK ORDER</h2>
        <p className="ms-label text-hush">LIVE FROM THE WAREHOUSE</p>
      </div>

      <div className="max-w-2xl">
        <div className="flex border border-line bg-white">
          <input
            className="ms-field border-0"
            placeholder="ORDER NO. (E.G. DS100001) OR TRACKING NO."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            aria-label="Order number"
          />
          <button
            onClick={lookup}
            className="ms-label bg-brand text-white px-6 md:px-10 hover:bg-brand-dark transition-colors"
          >
            {state === "loading" ? "…" : "FIND"}
          </button>
        </div>

        {state === "notfound" && (
          <p className="ms-label mt-4 border border-line bg-white px-4 py-3" role="status">
            NO ORDER FOUND FOR “{query.toUpperCase()}”. CHECK THE NUMBER OR CONTACT SALES.
          </p>
        )}
        {state === "error" && (
          <p className="ms-label mt-4 border border-red-500 text-red-500 bg-white px-4 py-3" role="alert">
            LOOKUP FAILED — TRY AGAIN.
          </p>
        )}

        {state === "found" && order && (
          <div className="mt-8 rounded-lg border border-line bg-white overflow-hidden">
            {/* header */}
            <div className="flex flex-wrap justify-between gap-4 p-5 border-b border-line bg-ink text-white">
              <div>
                <p className="ms-label opacity-60 mb-1">ORDER</p>
                <p className="ms-price text-2xl tracking-tight">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="ms-label opacity-60 mb-1">TRACKING</p>
                <p className="ms-price text-lg">{order.trackingNumber || "—"}</p>
              </div>
            </div>

            {/* timeline */}
            <div className="p-5 border-b border-line">
              <div className="relative">
                <span
                  className="absolute top-[7px] left-0 right-0 h-0.5 bg-ink opacity-10"
                  aria-hidden="true"
                />
                <span
                  className="absolute top-[7px] left-0 h-0.5 bg-brand"
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
                            reached ? "bg-brand" : "bg-white border border-line"
                          }`}
                          aria-hidden="true"
                        />
                        <span className={`ms-label ${reached ? "" : "opacity-30"}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {order.status === "returned" && (
                <p className="ms-label mt-6 text-center text-red-500">ORDER RETURNED</p>
              )}
            </div>

            {/* meta */}
            <div className="grid sm:grid-cols-2 sm:divide-x divide-line border-b border-line">
              <div className="p-5 space-y-1.5">
                <p className="ms-label text-hush mb-2">SHIPMENT</p>
                <p className="text-sm"><b>DESTINATION:</b> {order.destination || "—"}</p>
                <p className="text-sm"><b>PLACED:</b> {new Date(order.orderDate).toLocaleDateString()}</p>
                <p className="text-sm"><b>ETA:</b> {order.etaDays || "—"}</p>
              </div>
              <div className="p-5 space-y-1.5">
                <p className="ms-label text-hush mb-2">PAYMENT</p>
                <p className="text-sm"><b>METHOD:</b> {order.paymentMethod}</p>
<p className="text-sm">
                  <b>TOTAL:</b> ${order.totalAmount.toFixed(2)}
                  {order.currency !== "USD" && order.fxRate && (
                    <span className="text-hush">
                      {" "}
                      (≈ {order.currency}{" "}
                      {Math.round(order.totalAmount * order.fxRate).toLocaleString()})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* items */}
            <div className="p-5 border-b border-line">
              <p className="ms-label text-hush mb-3">ITEMS</p>
              <div className="divide-y divide-line">
                {lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <b className="uppercase">{li.productName}</b>
                      <span className="text-hush">
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
                <p className="ms-label text-hush mb-3">HISTORY</p>
                <ul className="space-y-2">
                  {events.map((ev) => (
                    <li key={ev.id} className="text-xs tracking-wide">
                      <span className="text-hush">
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
