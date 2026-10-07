import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useCart, useRegion } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { fmt, quoteCart } from "@/lib/format";
import { levyTag, pct } from "@/lib/levies";
import type { BusOperatorOption, RegionConfig, PlacedOrder } from "@/lib/types";

/* Same methods the order API persists (prisma `paymentMethod String`) —
   keys copied verbatim from the verified checkout (06ff76e). */
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
  onPlaced: (o: PlacedOrder) => void;
  onBack: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const region = useRegion((s) => s.region);
  const { toast } = useToast();

  /* Single guarded lookup. `regions` is empty while the catalog fetch is in
     flight — never touch `regions[0].x` bare (round-3 Blocker 1 crash). */
  const displayRegion = regions.find((r) => r.region === region) ?? regions[0];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    postalCode: "",
  });

  /* ---- Round 27: bus cargo operators + terminal receiver ---- */
  const [operators, setOperators] = useState<BusOperatorOption[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [receiver, setReceiver] = useState({ name: "", phone: "" });
  const selectedOperator = operators.find((o) => o.id === operatorId) ?? null;

  /* Operators follow the region (corridor fleet). Region switches reset the
     choice — an operator for one corridor never silently carries another. */
  useEffect(() => {
    if (!displayRegion) return;
    let cancelled = false;
    const code = displayRegion.region;
    setOperators([]);
    setOperatorId("");
    fetch(`/api/shipping/operators?region=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : { operators: [] }))
      .then((data) => {
        if (!cancelled) setOperators((data.operators as BusOperatorOption[]) ?? []);
      })
      .catch(() => {
        if (!cancelled) setOperators([]);
      });
    return () => {
      cancelled = true;
    };
  }, [displayRegion]);

  /* One quote for every display number — identical math to the order API,
     which re-prices server-side from the catalog (client totals are display
     only). The chosen operator drives the freight line. Never hand-roll
     duty/VAT sums again. */
  const q = useMemo(
    () => (displayRegion ? quoteCart(lines, displayRegion, selectedOperator) : null),
    [lines, displayRegion, selectedOperator]
  );

  async function placeOrder() {
    setPlacing(true);
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!customer.name.trim()) newErrors.name = "Required";
    if (!customer.email.trim()) newErrors.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = "Invalid email";
    if (!customer.phone.trim()) newErrors.phone = "Required";
    if (!customer.address.trim()) newErrors.address = "Required";
    if (!customer.city.trim()) newErrors.city = "Required";
    if (!paymentMethod) newErrors.paymentMethod = "Select a payment method";
    if (operators.length > 0 && !operatorId) {
      newErrors.operatorId = "Select the bus operator that carries this consignment";
    }
    if (operators.length > 0) {
      if (!receiver.name.trim()) newErrors.receiverName = "Required";
      if (!receiver.phone.trim()) newErrors.receiverPhone = "Required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setPlacing(false);
      return;
    }

    try {
      /* Flat body — the exact contract /api/orders destructures:
         customerName/contact/email/address/city/country/paymentMethod/cart
         plus the Round 27 receiver + operatorId. `country` is the REGION
         CODE (UG|KE|TZ|RW|CD|INTL). The API re-prices and re-resolves the
         operator server-side; no money fields are sent. */
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          contact: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          country: displayRegion.region,
          paymentMethod,
          receiverName: operators.length > 0 ? receiver.name : undefined,
          receiverPhone: operators.length > 0 ? receiver.phone : undefined,
          operatorId: operators.length > 0 ? operatorId : undefined,
          cart: lines.map((l) => ({
            productId: l.productId,
            variantLabel: l.variantLabel,
            qty: l.qty,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to place order");
      }

      clear();
      onPlaced(data.order);
    } catch (err) {
      toast({
        title: "ORDER FAILED",
        description: err instanceof Error ? err.message : "Could not place the order — try again.",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  }

  function goNext() {
    if (step === 1) {
      const newErrors: Record<string, string> = {};
      if (!customer.name.trim()) newErrors.name = "Required";
      if (!customer.email.trim()) newErrors.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = "Invalid email";
      if (!customer.phone.trim()) newErrors.phone = "Required";
      if (!customer.address.trim()) newErrors.address = "Required";
      if (!customer.city.trim()) newErrors.city = "Required";
      if (operators.length > 0 && !operatorId) {
        newErrors.operatorId = "Select the bus operator that carries this consignment";
      }
      if (operators.length > 0) {
        if (!receiver.name.trim()) newErrors.receiverName = "Required";
        if (!receiver.phone.trim()) newErrors.receiverPhone = "Required";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    setStep(step === 1 ? 2 : 3);
  }

  function goBack() {
    if (step === 1) {
      onBack();
    } else {
      setStep(step === 3 ? 2 : 1);
    }
  }

  /* ---- guards (after hooks, before any region/quote access) ---- */

  if (lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center md:px-6">
        <h2 className="ms-display mb-6 text-4xl opacity-30">CART EMPTY</h2>
        <button onClick={onBack} className="ms-label ms-key px-8 py-4">
          ← BACK TO CATALOG
        </button>
      </div>
    );
  }

  if (!displayRegion || !q) {
    // regions still loading — show a panel, never crash
    return (
      <div className="container mx-auto flex items-center justify-center gap-3 px-4 py-24 md:px-6">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <span className="ms-label text-hush">LOADING REGIONS…</span>
      </div>
    );
  }

  const money = (usd: number) => fmt(usd, displayRegion);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${
                    step >= s
                      ? "bg-ink text-white"
                      : "border border-line bg-white text-ink"
                  }`}
                >
                  {s}
                </div>
                <span className="ms-label text-xs">
                  {s === 1 ? "CUSTOMER" : s === 2 ? "REVIEW" : "CONFIRM"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-ink transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Customer details */}
        {step === 1 && (
          <div className="ms-tile p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">DELIVERY DETAILS</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="customer-name" className="ms-label mb-2 block text-hush">FULL NAME *</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  className={`ms-field w-full ${errors.name ? "border-red-500" : ""}`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-email" className="ms-label mb-2 block text-hush">EMAIL *</label>
                <input
                  id="customer-email"
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className={`ms-field w-full ${errors.email ? "border-red-500" : ""}`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-phone" className="ms-label mb-2 block text-hush">PHONE *</label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  className={`ms-field w-full ${errors.phone ? "border-red-500" : ""}`}
                  placeholder="+256..."
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.phone}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-company" className="ms-label mb-2 block text-hush">COMPANY</label>
                <input
                  id="customer-company"
                  type="text"
                  value={customer.company}
                  onChange={(e) =>
                    setCustomer({ ...customer, company: e.target.value })
                  }
                  className="ms-field w-full"
                  placeholder="Acme Ltd"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="customer-address" className="ms-label mb-2 block text-hush">ADDRESS *</label>
                <input
                  id="customer-address"
                  type="text"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  className={`ms-field w-full ${errors.address ? "border-red-500" : ""}`}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.address}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-city" className="ms-label mb-2 block text-hush">CITY *</label>
                <input
                  id="customer-city"
                  type="text"
                  value={customer.city}
                  onChange={(e) =>
                    setCustomer({ ...customer, city: e.target.value })
                  }
                  className={`ms-field w-full ${errors.city ? "border-red-500" : ""}`}
                  placeholder="Kampala"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500" role="alert">{errors.city}</p>
                )}
              </div>
              <div>
                <label htmlFor="customer-postal" className="ms-label mb-2 block text-hush">POSTAL CODE</label>
                <input
                  id="customer-postal"
                  type="text"
                  value={customer.postalCode}
                  onChange={(e) =>
                    setCustomer({ ...customer, postalCode: e.target.value })
                  }
                  className="ms-field w-full"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="customer-country" className="ms-label mb-2 block text-hush">COUNTRY</label>
                <input
                  id="customer-country"
                  type="text"
                  value={displayRegion.countryName}
                  readOnly
                  className="ms-field w-full bg-muted"
                />
                {/* country follows the header region select — derived, never
                    stored in state (no stale capture) */}
              </div>
            </div>

            {/* ---- Round 27: bus cargo operator + terminal receiver ---- */}
            {operators.length > 0 && (
              <div className="mt-8 border-t border-line pt-8">
                <h3 className="ms-label mb-1 text-ink">BUS CARGO OPERATOR *</h3>
                <p className="mb-4 text-sm text-hush">
                  Your consignment travels with the operator you pick. Freight is
                  the operator&apos;s tariff — per kilo, with a minimum charge —
                  booked under a waybill in their name.
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Bus cargo operator">
                  {operators.map((o) => {
                    const selected = operatorId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setOperatorId(o.id)}
                        className={`border px-4 py-3 text-left transition-colors ${
                          selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"
                        }`}
                      >
                        <span className="ms-label block">{o.name}</span>
                        <span className={`mt-1 block text-xs ${selected ? "text-white/80" : "text-hush"}`}>
                          KAMPALA → {displayRegion.countryName} · {o.transitDaysMin}–{o.transitDaysMax} DAY
                          {o.transitDaysMax === 1 ? "" : "S"}
                        </span>
                        <span className={`mt-0.5 block text-xs ${selected ? "text-white/80" : "text-hush"}`}>
                          ${o.cargoRatePerKg.toFixed(2)}/KG · MIN ${o.minCharge.toFixed(2)}
                        </span>
                        <span className={`mt-1 block text-xs leading-relaxed ${selected ? "text-white/70" : "text-hush"}`}>
                          {o.bookingNote}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.operatorId && (
                  <p className="mt-2 text-sm text-red-500" role="alert">{errors.operatorId}</p>
                )}

                <h3 className="ms-label mb-1 mt-8 text-ink">RECEIVER AT DESTINATION *</h3>
                <p className="mb-4 text-sm text-hush">
                  The person collecting the consignment at the {displayRegion.countryName} bus
                  terminal. They may be asked for ID matching this name.
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="receiver-name" className="ms-label mb-2 block text-hush">RECEIVER NAME *</label>
                    <input
                      id="receiver-name"
                      type="text"
                      value={receiver.name}
                      onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
                      className={`ms-field w-full ${errors.receiverName ? "border-red-500" : ""}`}
                      placeholder="Who collects at the terminal"
                    />
                    {errors.receiverName && (
                      <p className="mt-1 text-sm text-red-500" role="alert">{errors.receiverName}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="receiver-phone" className="ms-label mb-2 block text-hush">RECEIVER PHONE *</label>
                    <input
                      id="receiver-phone"
                      type="tel"
                      value={receiver.phone}
                      onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })}
                      className={`ms-field w-full ${errors.receiverPhone ? "border-red-500" : ""}`}
                      placeholder="+254..."
                    />
                    {errors.receiverPhone && (
                      <p className="mt-1 text-sm text-red-500" role="alert">{errors.receiverPhone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {operators.length === 0 && (
              <p className="mt-8 border-t border-line pt-6 text-sm text-hush">
                Freight for this destination is quoted at standard forwarder rates —
                no bus cargo operator runs this corridor.
              </p>
            )}

            {/* live freight + running total — the same quote step 2 confirms,
                visible WHILE the operator choice is made: the tariff
                difference between operators is the decision, and it was
                invisible until the review step. Display-only; the API
                re-prices server-side as always. */}
            <div className="mt-8 border-t border-line pt-6">
              <div className="ms-field p-4 md:p-5">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <span>
                      Subtotal · {lines.length} {lines.length === 1 ? "line" : "lines"} ·{" "}
                      {q.totalWeightKg} kg
                    </span>
                    <span>{money(q.subtotal)}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <span>
                      {selectedOperator
                        ? `Bus cargo — ${selectedOperator.name} ($${selectedOperator.cargoRatePerKg.toFixed(2)}/kg, min $${selectedOperator.minCharge.toFixed(2)})`
                        : "Freight — standard forwarder"}
                    </span>
                    <span>{money(q.shipping)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2 font-bold">
                    <span>Estimated total</span>
                    <span className="text-brand">{money(q.total)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-hush">
                  Duty, levies and VAT for {displayRegion.countryName} are already in
                  the estimate — the full line-by-line breakdown is on the next step.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="ms-tile p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">REVIEW ORDER</h2>

            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">DELIVERY ADDRESS</h3>
              <div className="ms-field p-4">
                <p className="font-medium">{customer.name}</p>
                <p>{customer.company || "Individual"}</p>
                <p>{customer.address}</p>
                <p>{customer.city}, {customer.postalCode || 'N/A'}</p>
                <p>{displayRegion.countryName}</p>
                <p className="mt-2">{customer.email} · {customer.phone}</p>
              </div>
            </div>

            {selectedOperator && (
              <div className="mb-8">
                <h3 className="ms-label mb-4 text-hush">BUS CARGO</h3>
                <div className="ms-field p-4">
                  <p className="font-medium">{selectedOperator.name}</p>
                  <p className="text-sm text-hush">
                    KAMPALA → {displayRegion.countryName} · {selectedOperator.transitDaysMin}–
                    {selectedOperator.transitDaysMax} DAY
                    {selectedOperator.transitDaysMax === 1 ? "" : "S"} · $
                    {selectedOperator.cargoRatePerKg.toFixed(2)}/KG · MIN $
                    {selectedOperator.minCharge.toFixed(2)}
                  </p>
                  <p className="mt-2 text-sm text-hush">
                    Receiver: <b className="text-ink">{receiver.name || "—"}</b> ·{" "}
                    {receiver.phone || "—"} (collects at the destination bus terminal)
                  </p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="ms-label mb-4 text-hush">ORDER ITEMS</h3>
              <div className="ms-field divide-y">
                {lines.map((l, i) => (
                  <div key={`${l.productId}-${l.variantLabel}`} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 overflow-hidden rounded bg-muted">
                        <Image
                          src={l.image || "/products/placeholder.png"}
                          alt={l.productLabel}
                          width={64}
                          height={64}
                          className="size-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{l.productLabel}</p>
                        <p className="text-sm text-hush">
                          {l.variantLabel} · Qty: {l.qty}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium">{money(l.unitPriceUsd)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ms-field p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{money(q.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DUTY ({pct(displayRegion.dutyRate)})</span>
                  <span>{money(q.duty)}</span>
                </div>
                {q.levies.length > 0 && (
                  <div className="flex justify-between">
                    <span>LEVIES ({levyTag(displayRegion.region)})</span>
                    <span>{money(q.leviesTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT ({pct(displayRegion.vatRate)})</span>
                  <span>{money(q.vat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {selectedOperator
                      ? `BUS CARGO — ${selectedOperator.name.toUpperCase()}`
                      : "FREIGHT"}
                  </span>
                  <span>{money(q.shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-3 font-bold">
                  <span>TOTAL</span>
                  <span className="text-brand">{money(q.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm — payment is arranged AFTER the order is placed
            (the site never charges anything itself). The copy states that
            plainly; the old "partner gateway" line was removed in round 26
            because no gateway exists — an unshipped claim is a liability. */}
        {step === 3 && (
          <div className="ms-tile p-6 md:p-8">
            <h2 className="ms-display mb-6 text-2xl">CONFIRM &amp; PLACE ORDER</h2>

            <div className="ms-field p-6">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  {displayRegion.currency}
                </div>
                <div>
                  <h3 className="mb-1 font-bold">Order total</h3>
                  <p className="text-brand font-bold">{money(q.total)}</p>
                  <p className="text-sm text-hush">
                    Nothing is charged on this site. After you place the order,
                    our team confirms stock and dispatch, then sends payment
                    instructions for the method you pick below.
                  </p>
                </div>
              </div>

              <h3 className="ms-label mb-3 text-hush">HOW YOU'LL PAY *</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    aria-pressed={paymentMethod === m.key}
                    className={`border px-4 py-3 text-left transition-colors ${
                      paymentMethod === m.key
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-white hover:border-ink"
                    }`}
                  >
                    <span className="ms-label block">{m.label}</span>
                    <span className={`text-xs ${paymentMethod === m.key ? "text-white/70" : "text-hush"}`}>
                      {m.hint}
                    </span>
                  </button>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="mt-2 text-sm text-red-500" role="alert">{errors.paymentMethod}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={goBack}
                  className="ms-label ms-key ms-key-ink px-4 py-3"
                  disabled={placing}
                >
                  BACK
                </button>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="ms-label ms-key px-4 py-3 flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      PLACING ORDER...
                    </>
                  ) : (
                    "PLACE ORDER"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={goBack}
            className="ms-label ms-key ms-key-ink px-6 py-3"
            disabled={placing}
          >
            {step === 1 ? "← CANCEL" : "← BACK"}
          </button>
          {step < 3 && (
            <button
              onClick={goNext}
              className="ms-label ms-key px-6 py-3"
              disabled={placing}
            >
              {step === 2 ? "CONTINUE TO CONFIRM →" : "CONTINUE →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
