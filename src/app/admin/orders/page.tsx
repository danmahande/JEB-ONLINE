import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOrders } from "./admin-orders";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminOrders />;
}
