"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/order-workflow";

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

  async function act(action: "advance" | "cancel" | "note") {
    if (!order) return;
    if (action === "cancel" && !window.confirm(`Cancel ${order.orderNumber}? Items return to stock.`)) {
      return;
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
          body: JSON.stringify({ action, note: noteDraft.trim() || undefined }),
        }
      );
      const result = (await response.json()) as { success: boolean; error?: string };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success) {
        setActionError(result.error ?? "The action failed. Try again.");
        return;
      }
      setNoteDraft("");
      if (action === "advance") setNotice("Status advanced — the customer was notified if their email is on the order.");
      if (action === "cancel") setNotice("Order cancelled — items were returned to stock.");
      if (action === "note") setNotice("Note attached — it is now visible on public tracking.");
      await load();
    } catch {
      setActionError("The action failed. Check your connection and retry.");
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
            {order.trackingNumber ?? "—"} · placed{" "}
            {new Date(order.createdAt).toLocaleString("en", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="w-fit rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
          {statusLabel(order.status)}
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
