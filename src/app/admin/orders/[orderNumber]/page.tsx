import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminOrderDetail } from "./admin-order-detail";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order detail",
  robots: { index: false, follow: false },
};

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { orderNumber } = await params;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        className="text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        href="/admin/orders"
      >
        ← All orders
      </Link>
      <AdminOrderDetail orderNumber={orderNumber} />
    </main>
  );
}
