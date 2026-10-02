import { redirect } from "next/navigation";
import { AdminProducts } from "@/app/admin/products/admin-products";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminProductsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminProducts />;
}
