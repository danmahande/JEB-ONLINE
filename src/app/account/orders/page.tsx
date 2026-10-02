import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/admin-auth";
import { CustomerSignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your orders | Meridian Supply Co.",
  robots: { index: false, follow: false },
};

export default async function CustomerOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");

  const orders = await db.orderProcessing.findMany({
    where: { customerAccountId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      orderNumber: true,
      status: true,
      createdAt: true,
      destination: true,
      lineItems: {
        orderBy: { createdAt: "asc" },
        select: { id: true, productName: true, variant: true, qty: true },
      },
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <Link className="text-sm font-semibold text-ink underline" href="/">
          Back to the store
        </Link>
        <CustomerSignOutButton />
      </div>
      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-hush">
          Customer account
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Your orders</h1>
        <p className="mt-2 text-sm text-hush">
          Orders placed while you were signed in appear here. Guest orders remain available through order tracking.
        </p>
      </section>
      {orders.length === 0 ? (
        <section className="mt-8 rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">No account orders yet</h2>
          <p className="mt-2 text-sm text-hush">
            Sign in before checking out to keep future orders in this list.
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            href="/"
          >
            Browse the store
          </Link>
        </section>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li
              className="rounded-lg border border-line bg-white p-5"
              key={order.orderNumber}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{order.orderNumber}</h2>
                  <p className="mt-1 text-sm text-hush">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(order.createdAt)}
                    {order.destination ? ` · ${order.destination}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
                  {order.status.replaceAll("_", " ")}
                </span>
              </div>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {order.lineItems.map((item) => (
                  <li className="py-3 text-sm text-ink" key={item.id}>
                    {item.productName}
                    {item.variant ? ` · ${item.variant}` : ""} — {item.qty}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
