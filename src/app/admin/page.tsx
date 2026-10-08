import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";

/**
 * `/admin` used to redirect straight to /admin/products, so the owner's day
 * opened on inventory while orders — the work with a deadline — sat behind a
 * status chip. It now lands on an overview: orders needing action, money owed,
 * stock risk.
 */
export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminDashboard />;
}
