"use client";

import { useMemo, useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { fmt, quoteCart } from "@/lib/format";
import type { PlacedOrder, RegionConfig } from "@/lib/types";

const PAYMENT_METHODS = [
  { key: "MTN MoMo", label: "MTN MOMO", hint: "UG · RW" },
  { key: "M-Pesa", label: "M-PESA", hint: "KE · TZ" },
  { key: "Airtel Money", label: "AIRTEL MONEY", hint: "REGIONAL" },
  { key: "Bank Transfer", label: "BANK TRANSFER / TT", hint: "CROSS-BORDER" },
  { key: "Cash on Delivery", label: "CASH ON DELIVERY", hint: "EAC ONLY" },
];

export default function Checkout({
  regions,
  onPlaced,
  onBack,
}: {
  regions: RegionConfig[];
  onPlaced: (order: PlacedOrder) => void;
  onBack: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const region = useRegion((s) => s.region);
  const setRegion = useRegion((s) => s.setRegion);
  const active = regions.find((r) => r.region === region);

  const [form, setForm] = useState({
    customerName: "",
    contact: "",
    email: "",
    city: "",
    address: "",
    paymentMethod: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = useMemo(
    () => (active ? quoteCart(lines, active) : null),
    [lines, active]
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function placeOrder() {
    setError(null);
    if (!form.customerName.trim() || !form.contact.trim() || !form.paymentMethod) {
      setError("NAME, PHONE AND PAYMENT METHOD ARE REQUIRED.");
      return;
    }
    if (!active) {
      setError("SELECT A DESTINATION REGION.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: active.region,
          cart: lines.map((l) => ({
            productId: l.productId,
            variantLabel: l.variantLabel,
            qty: l.qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order failed");
      }
      clear();
      onPlaced(data.order);
    } catch (e: any) {
      setError((e.message || "ORDER FAILED").toUpperCase());
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="px-4 md:px-8 py-20 text-center">
        <h2 className="ms-display text-4xl opacity-30 mb-6">CART EMPTY</h2>
        <button onClick={onBack} className="ms-label bg-brand text-white px-8 py-4 hover:bg-brand-dark transition-colors">
          ← BACK TO CATALOG
        </button>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 py-10 md:py-14" aria-label="Checkout">
      <h2 className="ms-display text-4xl md:text-6xl mb-8">CHECKOUT</h2>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* form */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <p className="ms-label mb-3 text-hush">01 — DESTINATION</p>
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => (
                <button
                  key={r.region}
                  onClick={() => setRegion(r.region)}
                  className={`ms-label border border-line bg-white px-4 py-3 transition-colors ${
                    r.region === region
                      ? "bg-brand text-white border-brand"
                      : "hover:bg-ink hover:text-white"
                  }`}
                >
                  {r.countryName}
                </button>
              ))}
            </div>
            {active && (
              <p className="ms-label mt-3 text-hush">
                ETA {active.etaDays} · DUTY {Math.round(active.dutyRate * 100)}% · VAT{" "}
                {Math.round(active.vatRate * 100)}% · {active.currency}
              </p>
            )}
          </div>

          <div>
            <p className="ms-label mb-3 text-hush">02 — DELIVERY DETAILS</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="ms-field"
                placeholder="FULL NAME *"
                value={form.customerName}
                onChange={set("customerName")}
                aria-label="Full name"
              />
              <input
                className="ms-field"
                placeholder="PHONE (E.G. +2567…) *"
                value={form.contact}
                onChange={set("contact")}
                aria-label="Phone contact"
              />
              <input
                className="ms-field"
                placeholder="EMAIL"
                type="email"
                value={form.email}
                onChange={set("email")}
                aria-label="Email"
              />
              <input
                className="ms-field"
                placeholder="CITY / TOWN"
                value={form.city}
                onChange={set("city")}
                aria-label="City"
              />
              <input
                className="ms-field sm:col-span-2"
                placeholder="DELIVERY ADDRESS / COLLECTION POINT"
                value={form.address}
                onChange={set("address")}
                aria-label="Delivery address"
              />
              <textarea
                className="ms-field sm:col-span-2"
                placeholder="NOTES (CUSTOMS PREFERENCE, TIMING…)"
                rows={2}
                value={form.notes}
                onChange={set("notes")}
                aria-label="Order notes"
              />
            </div>
          </div>

          <div>
            <p className="ms-label mb-3 text-hush">03 — PAYMENT</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setForm((f) => ({ ...f, paymentMethod: m.key }))}
                  className={`border bg-white px-4 py-3 text-left transition-colors ${
                    form.paymentMethod === m.key
                      ? "bg-brand text-white border-brand"
                      : "border-line hover:bg-ink hover:text-white"
                  }`}
                >
                  <span className="ms-label block">{m.label}</span>
                  <span className="text-[10px] tracking-widest opacity-50">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* summary */}
        <div className="lg:col-span-2">
          <div className="border border-line bg-white p-5 lg:sticky lg:top-24">
            <p className="ms-label mb-4">ORDER SUMMARY</p>
            <div className="max-h-56 overflow-y-auto ms-scroll divide-y divide-line mb-4">
              {lines.map((l) => (
                <div
                  key={`${l.productId}-${l.variantLabel}`}
                  className="flex justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="truncate">
                    <b className="uppercase">{l.productLabel}</b>
                    <span className="opacity-50"> · {l.variantLabel} × {l.qty}</span>
                  </span>
                  <span className="font-bold whitespace-nowrap">
                    {active ? fmt(l.unitPriceUsd * l.qty, active) : `$${(l.unitPriceUsd * l.qty).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>

            {active && q && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-60">SUBTOTAL</span>
                  <span className="font-bold">{fmt(q.subtotal, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">DUTY ({Math.round(active.dutyRate * 100)}%)</span>
                  <span className="font-bold">{fmt(q.duty, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">VAT ({Math.round(active.vatRate * 100)}%)</span>
                  <span className="font-bold">{fmt(q.vat, active)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">FREIGHT</span>
                  <span className="font-bold">{fmt(q.shipping, active)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 mt-3">
                  <span className="ms-label">TOTAL DUE</span>
                  <span className="font-black text-2xl text-brand">{fmt(q.total, active)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="ms-label mt-4 bg-red-500 text-white px-3 py-2" role="alert">
                ⚠ {error}
              </p>
            )}

            <button
              onClick={placeOrder}
              disabled={submitting}
              className="ms-label w-full bg-brand text-white py-4 mt-5 hover:bg-brand-dark disabled:opacity-40 transition-colors"
            >
              {submitting ? "PLACING ORDER…" : "PLACE ORDER →"}
            </button>
            <button
              onClick={onBack}
              className="ms-label w-full border border-line py-3 mt-2 hover:bg-ink hover:text-white transition-colors"
            >
              ← CONTINUE SHOPPING
            </button>
            <p className="text-[10px] tracking-widest text-hush mt-3 leading-relaxed">
              FINAL DUTIES SUBJECT TO CUSTOMS ASSESSMENT. ORDERS ROUTE TO OUR
              WAREHOUSE FOR PICKING AND DISPATCH AS SOON AS PAYMENT IS CONFIRMED.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
