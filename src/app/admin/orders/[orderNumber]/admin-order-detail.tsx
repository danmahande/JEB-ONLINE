"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/order-workflow";
import {
  PAYMENT_METHODS,
  balanceDueUsd,
  paymentStatusLabel,
  shouldWarnBeforeDispatch,
} from "@/lib/order-payment";
import {
  buildOrderActionBody,
  dispatchBlockReason,
} from "@/lib/admin-order-action";

type LineItem = {
  id: string;
  productId: string;
  productName: string;
  brand: string | null;
  variant: string | null;
  qty: number;
  unitSellingPrice: number;
  lineTotal: number;
};

type OrderEvent = {
  id: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

type PaymentRecord = {
  id: string;
  method: string;
  reference: string | null;
  amountUsd: number;
  note: string | null;
  receivedAt: string;
};

type AdminOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerInfo: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  trackingNumber: string | null;
  /// True while the customer is still looking at the checkout placeholder
  /// (TRK-<order>-<region>) rather than a real operator waybill.
  trackingIsPlaceholder: boolean;
  dispatchedAt: string | null;
  paymentStatus: string;
  paidAt: string | null;
  paidAmountUsd: number;
  currency: string;
  fxRate: number;
  region: string;
  destination: string | null;
  dutyAmount: number;
  vatAmount: number;
  shippingAmount: number;
  totalWeightKg: number;
  notes: string | null;
  createdBy: string;
  receiverName: string | null;
  receiverPhone: string | null;
  operatorName: string | null;
  operatorRatePerKg: number | null;
  operatorMinCharge: number | null;
  freightSource: string;
  lineItems: LineItem[];
  events: OrderEvent[];
  /// The owner's private payment ledger (admin-only route; never public).
  payments: PaymentRecord[];
};

type Movement = {
  id: string;
  productId: string;
  delta: number;
  resultingStock: number;
  reason: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

type DetailResponse = {
  success: boolean;
  error?: string;
  order?: AdminOrder;
  movements?: Movement[];
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function AdminOrderDetail({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  // Dispatch: the real waybill, replacing the checkout placeholder the customer
  // is currently looking at.
  const [dispatchTracking, setDispatchTracking] = useState("");
  const [dispatchNote, setDispatchNote] = useState("");
  // Payment recording (owner-only ledger).
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
          { cache: "no-store", signal }
        );
        const result = (await response.json()) as DetailResponse;
        if (response.status === 401) {
          router.replace("/admin/login");
          return false;
        }
        if (!response.ok || !result.success || !result.order) {
          setError(result.error ?? "Order could not be loaded.");
          return false;
        }
        setOrder(result.order);
        setMovements(result.movements ?? []);
        return true;
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Order could not be loaded. Check your connection and retry.");
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, router]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function act(action: "advance" | "cancel" | "note" | "dispatch") {
    if (!order) return;
    if (
      action === "cancel" &&
      !window.confirm(
        `Cancel ${order.orderNumber}? Items return to stock and the customer is emailed.`
      )
    ) {
      return;
    }

    // Warn, never block: dispatch is the owner's call (a trusted repeat buyer,
    // or cash on delivery, legitimately ships before money moves). The warning
    // exists because "who has paid" used to be invisible here.
    if (
      (action === "advance" || action === "dispatch") &&
      shouldWarnBeforeDispatch(order.paymentStatus) &&
      !window.confirm(
        `${order.orderNumber} is ${paymentStatusLabel(order.paymentStatus).toLowerCase()} ` +
          `(${order.paidAmountUsd.toFixed(2)} of ${order.totalAmount.toFixed(2)} received).\n\n` +
          `Continue anyway?`
      )
    ) {
      return;
    }

    if (action === "dispatch") {
      const reason = dispatchBlockReason(
        dispatchTracking,
        order.trackingNumber,
        order.trackingIsPlaceholder
      );
      if (reason) {
        setActionError(reason);
        return;
      }
    }

    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // The body is built by a tested helper (src/lib/admin-order-action.ts)
          // that never lets the standalone note travel with an action that does
          // not publish it. It used to ride along with every action, so a
          // half-typed note became the public tracking event (and the customer's
          // email) the moment the owner clicked "Mark shipped". Order events are
          // append-only, so there was no undo.
          body: JSON.stringify(
            buildOrderActionBody(action, {
              note: noteDraft,
              trackingNumber: dispatchTracking,
              dispatchNote,
            })
          ),
        }
      );
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        paymentWarning?: string;
      };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setActionError(result.error ?? "The action failed. Try again.");
        return;
      }
      if (action === "note") setNoteDraft("");
      if (action === "dispatch") {
        setDispatchTracking("");
        setDispatchNote("");
      }
      if (action === "advance") setNotice("Status advanced — the customer was notified if their email is on the order.");
      if (action === "cancel") setNotice("Order cancelled — items were returned to stock.");
      if (action === "note") setNotice("Note attached — it is now visible on public tracking.");
      if (action === "dispatch") setNotice("Dispatched — the real tracking number is now on the customer's order.");
      await load();
    } catch {
      setActionError("The action failed. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!order) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter the amount actually received.");
      return;
    }

    // Recording money is a bookkeeping act, not a shipment: no payment warning here.
    // A confirm keeps a mistyped zero out of the ledger, which is append-only in
    // practice (nothing in the UI removes a payment row).
    if (
      !window.confirm(
        `Record ${amount.toFixed(2)} USD received by ${paymentMethod}` +
          `${paymentReference.trim() ? ` (ref ${paymentReference.trim()})` : ""}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: paymentMethod,
            amountUsd: amount,
            reference: paymentReference.trim() || undefined,
          }),
        }
      );
      const result = (await response.json()) as { success: boolean; error?: string };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setActionError(result.error ?? "The payment could not be recorded.");
        return;
      }
      setPaymentAmount("");
      setPaymentReference("");
      setNotice("Payment recorded.");
      await load();
    } catch {
      setActionError("The payment could not be recorded. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return (
      <p className="mt-5 rounded-md border border-line bg-white p-5 text-sm text-hush" role="status">
        Loading {orderNumber}...
      </p>
    );
  }
  if (error || !order) {
    return (
      <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error || "Order not found."}
      </p>
    );
  }

  const subtotal = order.lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const cancellable = order.status === "new_order" || order.status === "processing";
  const advanceLabel: Record<string, string> = {
    new_order: "Start processing",
    processing: "Mark shipped",
    shipped: "Mark delivered",
  };

  return (
    <div className="mt-4">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Order · {order.region}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-hush">
            {order.trackingNumber ?? "—"}
            {order.trackingIsPlaceholder && (
              <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hush">
                checkout placeholder
              </span>
            )}
            {" · "}placed{" "}
            {new Date(order.createdAt).toLocaleString("en", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          {order.dispatchedAt && (
            <p className="mt-1 text-sm text-hush">
              Dispatched{" "}
              {new Date(order.dispatchedAt).toLocaleString("en", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <span className="w-fit rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
          {statusLabel(order.status)}
          {" · "}
          {paymentStatusLabel(order.paymentStatus)}
        </span>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          {notice}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* actions */}
      <section aria-label="Order actions" className="mt-5 rounded-md border border-line bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-hush">Warehouse actions</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {advanceLabel[order.status] ? (
            <Button disabled={busy} onClick={() => void act("advance")} type="button">
              {advanceLabel[order.status]}
            </Button>
          ) : null}
          {cancellable ? (
            <Button disabled={busy} onClick={() => void act("cancel")} type="button" variant="outline">
              Cancel order
            </Button>
          ) : null}
          {order.status === "delivered" ? (
            <p className="text-sm text-hush">This order is complete.</p>
          ) : null}
          {order.status === "cancelled" || order.status === "returned" ? (
            <p className="text-sm text-hush">This order is closed.</p>
          ) : null}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-ink" htmlFor="order-note">
            Note for the customer
          </label>
          <textarea
            className="mt-2 min-h-[72px] w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-brand focus-visible:outline-none"
            id="order-note"
            maxLength={500}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Appears on the customer's tracking page and in their status emails. e.g. 'Dispatched on the Tuesday run — driver Amos.'"
            value={noteDraft}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-hush">
              Tracking history is public — write notes the customer should read.
            </p>
            <Button disabled={busy || !noteDraft.trim()} onClick={() => void act("note")} type="button" variant="secondary">
              Attach note
            </Button>
          </div>
        </div>
      </section>

      {/* dispatch — the real waybill replaces the checkout placeholder */}
      {(order.status === "new_order" ||
        order.status === "processing" ||
        order.status === "shipped") &&
      !(order.status === "shipped" && !order.trackingIsPlaceholder) ? (
        <section
          aria-label="Dispatch"
          className="mt-5 rounded-md border border-line bg-white p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            Dispatch
          </p>
          <p className="mt-2 text-sm text-hush">
            The number above was generated at checkout — it is not the operator&apos;s.
            Enter the real waybill here: it becomes the number the customer sees and
            can quote at the terminal.
          </p>
          <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void act("dispatch"); }}>
            <label className="block text-sm font-medium text-ink" htmlFor="dispatch-tracking">
              Operator waybill / tracking number
            </label>
            <input
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-brand"
              id="dispatch-tracking"
              maxLength={80}
              onChange={(event) => setDispatchTracking(event.target.value)}
              placeholder="e.g. Link Bus waybill LB-4471"
              required
              value={dispatchTracking}
            />
            <label className="mt-3 block text-sm font-medium text-ink" htmlFor="dispatch-note">
              Note for the customer <span className="font-normal text-hush">(optional, public)</span>
            </label>
            <input
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:border-brand"
              id="dispatch-note"
              maxLength={500}
              onChange={(event) => setDispatchNote(event.target.value)}
              placeholder="e.g. On the Tuesday run — driver Amos."
              value={dispatchNote}
            />
            <div className="mt-3">
              <Button disabled={busy || !dispatchTracking.trim()} type="submit">
                {busy ? "Working…" : "Mark shipped with this number"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {/* payment — the owner's private ledger; nothing here reaches the customer */}
      <section
        aria-label="Payment"
        className="mt-5 rounded-md border border-line bg-white p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            Payment
          </p>
          <p className="text-sm text-ink">
            <span className="font-semibold">{paymentStatusLabel(order.paymentStatus)}</span>
            {" · "}
            {order.paidAmountUsd.toFixed(2)} of {order.totalAmount.toFixed(2)} USD received
            {balanceDueUsd(order.totalAmount, order.paidAmountUsd) > 0 && (
              <> · balance {balanceDueUsd(order.totalAmount, order.paidAmountUsd).toFixed(2)}</>
            )}
          </p>
        </div>
        <p className="mt-2 text-xs text-hush">
          This record is internal — the customer never sees it. Their checkout said they
          intend to pay by {order.paymentMethod}.
        </p>

        {order.payments.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {order.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-sm"
              >
                <span className="text-ink">
                  {payment.amountUsd.toFixed(2)} USD · {payment.method}
                  {payment.reference ? ` · ref ${payment.reference}` : ""}
                </span>
                <span className="text-xs text-hush">
                  {new Date(payment.receivedAt).toLocaleString("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form className="mt-4" onSubmit={recordPayment}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-hush" htmlFor="payment-method">
                Method
              </label>
              <select
                className="mt-1 w-full rounded-md border border-line bg-white px-2 py-2 text-sm text-ink focus-visible:border-brand"
                id="payment-method"
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-hush" htmlFor="payment-amount">
                Amount received (USD)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-line bg-white px-2 py-2 text-sm text-ink focus-visible:border-brand"
                id="payment-amount"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder={balanceDueUsd(order.totalAmount, order.paidAmountUsd).toFixed(2)}
                step="0.01"
                type="number"
                value={paymentAmount}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-hush" htmlFor="payment-reference">
                Reference
              </label>
              <input
                className="mt-1 w-full rounded-md border border-line bg-white px-2 py-2 text-sm text-ink focus-visible:border-brand"
                id="payment-reference"
                maxLength={120}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="MoMo / bank ref"
                value={paymentReference}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={busy || !paymentAmount} type="submit" variant="secondary">
              {busy ? "Working…" : "Record payment"}
            </Button>
            {balanceDueUsd(order.totalAmount, order.paidAmountUsd) > 0 && (
              <button
                className="ms-label text-hush underline decoration-line underline-offset-4 hover:text-ink"
                onClick={() =>
                  setPaymentAmount(
                    balanceDueUsd(order.totalAmount, order.paidAmountUsd).toFixed(2)
                  )
                }
                type="button"
              >
                USE FULL BALANCE
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* customer + money */}
        <section aria-label="Customer and totals" className="rounded-md border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">Customer</p>
          <p className="mt-2 text-sm font-semibold text-ink">{order.customerName}</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-hush">
            {order.customerInfo.split(" | ").join("\n")}
          </p>
          {order.notes ? (
            <p className="mt-3 rounded-md border border-line bg-mist px-3 py-2 text-sm text-ink">
              Customer note at checkout: {order.notes}
            </p>
          ) : null}
          {order.receiverName || order.operatorName ? (
            <div className="mt-3 rounded-md border border-line bg-mist px-3 py-2 text-sm text-ink">
              <p className="text-xs font-semibold uppercase tracking-wide text-hush">
                Bus cargo dispatch
              </p>
              {order.operatorName ? (
                <p className="mt-1">
                  Via <b>{order.operatorName}</b> — tariff snapshot ${order.operatorRatePerKg}
                  /kg · min ${order.operatorMinCharge} at order time
                </p>
              ) : null}
              {order.receiverName ? (
                <p className="mt-0.5">
                  Receiver: <b>{order.receiverName}</b> · {order.receiverPhone}
                </p>
              ) : null}
            </div>
          ) : null}
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-hush">Subtotal ({order.lineItems.length} lines)</dt>
              <dd className="font-semibold text-ink">{currency.format(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-hush">Duty / VAT / freight</dt>
              <dd className="text-ink">
                {currency.format(order.dutyAmount)} / {currency.format(order.vatAmount)} /{" "}
                {currency.format(order.shippingAmount)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="font-semibold text-ink">Total (USD base)</dt>
              <dd className="font-semibold text-ink">{currency.format(order.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-hush">Payment method</dt>
              <dd className="text-ink">{order.paymentMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-hush">Weight / FX at checkout</dt>
              <dd className="text-ink">
                {order.totalWeightKg} kg · 1 USD ≈ {order.fxRate} {order.currency}
              </dd>
            </div>
          </dl>
        </section>

        {/* items + history */}
        <section aria-label="Items and history" className="rounded-md border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">Line items</p>
          <ul className="mt-2 divide-y divide-line">
            {order.lineItems.map((li) => (
              <li key={li.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">
                  <b>{li.productName}</b>
                  {li.variant ? ` · ${li.variant}` : ""} × {li.qty}
                  <span className="block text-xs text-hush">{li.productId}</span>
                </span>
                <span className="font-semibold text-ink">{currency.format(li.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-hush">History</p>
          <ul className="mt-2 space-y-2">
            {order.events.map((ev) => (
              <li key={ev.id} className="text-[13px] leading-5">
                <span className="text-hush">
                  {new Date(ev.createdAt).toLocaleString("en", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  — {ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}
                </span>
                {ev.note ? <span className="block text-ink">{ev.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* stock ledger */}
      <section aria-label="Recent stock movements" className="mt-5 rounded-md border border-line bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-hush">
          Recent stock movements for these products
        </p>
        {movements.length === 0 ? (
          <p className="mt-2 text-sm text-hush">
            No stock movements recorded yet — sales decrement stock silently; the
            ledger starts with receipts, adjustments and cancellation restocks.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-ink">
                  <b>{m.delta > 0 ? `+${m.delta}` : m.delta}</b> · {m.reason.replaceAll("_", " ")}
                  <span className="text-hush">
                    {" "}
                    → {m.resultingStock} on shelf · {m.createdBy}
                  </span>
                  {m.note ? <span className="block text-xs text-hush">{m.note}</span> : null}
                </span>
                <span className="text-xs text-hush">
                  {new Date(m.createdAt).toLocaleString("en", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
