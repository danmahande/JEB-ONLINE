"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { paymentStatusLabel } from "@/lib/order-payment";
import { statusLabel } from "@/lib/order-workflow";

type RecentOrder = {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  region: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  trackingIsPlaceholder: boolean;
  _count: { lineItems: number };
};

type StockRiskItem = {
  productId: string;
  productLabel: string;
  slug: string;
  currentStock: number;
  minStock: number;
  unit: string;
};

type DashboardResponse = {
  success: boolean;
  error?: string;
  orders?: {
    newOrder: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    total: number;
  };
  payment?: { unpaid: number; partPaid: number; paid: number; owedUsd: number };
  stock?: {
    soldOutCount: number;
    lowStockCount: number;
    worst: StockRiskItem[];
  };
  recentOrders?: RecentOrder[];
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const when = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * The owner's landing surface.
 *
 * `/admin` previously redirected straight to /admin/products, so the day opened
 * on inventory while orders — the work with an actual deadline — sat behind a
 * status chip. This leads with what needs action and what is unpaid, because in
 * a no-payment-gateway store "who has paid" is the question the dashboard exists
 * to answer.
 */
export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const result = (await response.json()) as DashboardResponse;
      if (!response.ok || !result.success) {
        setError(result.error ?? "The dashboard could not be loaded.");
        return;
      }
      setError("");
      setData(result);
    } catch {
      setError("The dashboard could not be loaded. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="px-4 py-12 text-sm text-hush md:px-8">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="px-4 py-12 md:px-8">
        <p role="alert" className="mb-4 rounded-md border border-line bg-white p-4 text-sm text-ink">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="ms-key ms-label px-4 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const orders = data?.orders;
  const payment = data?.payment;
  const stock = data?.stock;

  return (
    <div className="px-4 py-8 md:px-8 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Overview</h1>
      <p className="mt-1 text-sm text-hush">
        What needs action today. Orders are the only thing here with a deadline.
      </p>

      {/* ---- the two figures that decide the day ---- */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/orders?status=new_order"
          className="block rounded-lg border border-line bg-white p-5 transition-colors hover:border-brand"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            New orders to process
          </p>
          <p className="mt-1 text-3xl font-semibold leading-none text-ink">
            {orders?.newOrder ?? 0}
          </p>
          <p className="mt-2 text-xs text-hush">
            {orders?.processing ?? 0} in processing · {orders?.shipped ?? 0} shipped
          </p>
        </Link>

        <Link
          href="/admin/orders?payment=unpaid"
          className="block rounded-lg border border-line bg-white p-5 transition-colors hover:border-brand"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            Outstanding balance
          </p>
          <p className="mt-1 text-3xl font-semibold leading-none text-ink">
            {usd.format(payment?.owedUsd ?? 0)}
          </p>
          <p className="mt-2 text-xs text-hush">
            {payment?.unpaid ?? 0} unpaid · {payment?.partPaid ?? 0} part paid ·{" "}
            {payment?.paid ?? 0} settled
          </p>
        </Link>
      </div>

      {/* ---- stock risk ---- */}
      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            Stock attention
          </p>
          <Link className="ms-label text-hush hover:text-ink" href="/admin/products">
            OPEN PRODUCTS →
          </Link>
        </div>
        {(stock?.soldOutCount ?? 0) === 0 && (stock?.lowStockCount ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-hush">
            Every published product is above its minimum stock.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink">
              {stock?.soldOutCount ?? 0} sold out · {stock?.lowStockCount ?? 0} at or
              below minimum
            </p>
            <ul className="mt-3 space-y-1.5">
              {(stock?.worst ?? []).map((p) => (
                <li
                  key={p.productId}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm"
                >
                  <span className="text-ink">{p.productLabel}</span>
                  <span className={p.currentStock <= 0 ? "text-brand" : "text-hush"}>
                    {p.currentStock} {p.unit} (min {p.minStock})
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ---- recent orders ---- */}
      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-hush">
            Latest orders
          </p>
          <Link className="ms-label text-hush hover:text-ink" href="/admin/orders">
            ALL ORDERS →
          </Link>
        </div>
        {(data?.recentOrders ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-hush">No orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {(data?.recentOrders ?? []).map((order) => (
              <li key={order.orderNumber}>
                <Link
                  href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 transition-colors hover:bg-mist/40"
                >
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-ink">{order.orderNumber}</span>
                    <span className="text-sm text-hush">{order.customerName}</span>
                    {order.status === "new_order" && (
                      <span className="rounded border border-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                        new
                      </span>
                    )}
                    {order.trackingIsPlaceholder && order.status === "shipped" && (
                      <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hush">
                        no real waybill
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-3 text-sm">
                    <span
                      className={
                        order.paymentStatus === "paid" ? "text-hush" : "text-brand"
                      }
                    >
                      {paymentStatusLabel(order.paymentStatus)}
                    </span>
                    <span className="text-ink">{usd.format(order.totalAmount)}</span>
                    <span className="text-xs text-hush">
                      {statusLabel(order.status)}
                    </span>
                    <span className="text-xs text-hush">
                      {when.format(new Date(order.createdAt))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
