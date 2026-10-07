"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { statusLabel } from "@/lib/order-workflow";

type AdminOrderRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  createdAt: string;
  customerName: string;
  customerInfo: string;
  totalAmount: number;
  currency: string;
  fxRate: number;
  region: string;
  destination: string | null;
  paymentMethod: string;
  status: string;
  trackingNumber: string | null;
  totalWeightKg: number;
  _count: { lineItems: number; events: number };
};

type OrdersResponse = {
  success: boolean;
  error?: string;
  orders?: AdminOrderRow[];
  counts?: Record<string, number>;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const FILTERS = [
  { key: "ALL", label: "ALL" },
  { key: "new_order", label: "NEW" },
  { key: "processing", label: "PROCESSING" },
  { key: "shipped", label: "SHIPPED" },
  { key: "delivered", label: "DELIVERED" },
  { key: "cancelled", label: "CANCELLED" },
  { key: "returned", label: "RETURNED" },
];

function statusTone(status: string): string {
  switch (status) {
    case "new_order":
      return "bg-orange-50 text-orange-800";
    case "processing":
      return "bg-blue-50 text-blue-800";
    case "shipped":
      return "bg-indigo-50 text-indigo-800";
    case "delivered":
      return "bg-green-50 text-green-800";
    case "cancelled":
      return "bg-red-50 text-red-800";
    case "returned":
      return "bg-secondary text-hush";
    default:
      return "bg-secondary text-hush";
  }
}

export function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          status: statusFilter,
          page: String(page),
          pageSize: "25",
        });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/orders?${params.toString()}`, {
          cache: "no-store",
          signal,
        });
        const result = (await response.json()) as OrdersResponse;
        if (response.status === 401) {
          router.replace("/admin/login");
          return false;
        }
        if (!response.ok || !result.success) {
          setError(result.error ?? "Orders could not be loaded.");
          return false;
        }
        setOrders(result.orders ?? []);
        setCounts(result.counts ?? {});
        setTotalPages(result.totalPages ?? 1);
        setTotal(result.total ?? 0);
        return true;
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Orders could not be loaded. Check your connection and retry.");
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, page, query, router]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const countFor = (key: string) =>
    key === "ALL"
      ? Object.values(counts).reduce((sum, n) => sum + n, 0)
      : counts[key] ?? 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Orders
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-hush">
            Every storefront order lands here as NEW. Open an order to advance it
            through processing and shipping, attach a note the customer can see
            on tracking, or cancel it before dispatch (items return to stock).
          </p>
        </div>
      </header>

      <section aria-label="Status filters" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setStatusFilter(f.key);
              setPage(1);
            }}
            aria-pressed={statusFilter === f.key}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              statusFilter === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink hover:border-ink"
            }`}
          >
            {f.label} ({countFor(f.key)})
          </button>
        ))}
      </section>

      <div className="mt-4 max-w-sm">
        <label className="sr-only" htmlFor="order-search">
          Search orders
        </label>
        <Input
          autoComplete="off"
          id="order-search"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search order no., tracking no., or customer…"
          value={query}
        />
      </div>

      {error ? (
        <p
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 rounded-md border border-line bg-white p-5 text-sm text-hush" role="status">
          Loading orders...
        </p>
      ) : orders.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-line bg-white p-6 text-sm text-hush">
          No orders match this filter yet. Storefront orders appear here the
          moment checkout completes.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-hush">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0 hover:bg-mist">
                  <td className="px-4 py-3">
                    <Link
                      className="font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                      href={`/admin/orders/${order.orderNumber}`}
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="mt-0.5 block text-xs text-hush">
                      {order._count.lineItems} item{order._count.lineItems === 1 ? "" : "s"} ·{" "}
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{order.customerName}</td>
                  <td className="px-4 py-3 text-hush">{order.destination ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {currency.format(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(order.status)}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-hush">
                    {new Date(order.createdAt).toLocaleString("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Order pages" className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded-md border border-line bg-white px-3 py-2 font-semibold text-ink disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <p className="text-hush">
            Page {page} of {totalPages} · {total} orders
          </p>
          <button
            type="button"
            className="rounded-md border border-line bg-white px-3 py-2 font-semibold text-ink disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </nav>
      ) : null}
    </main>
  );
}
