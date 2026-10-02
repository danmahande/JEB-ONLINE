import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPage() {
  const session = await getAdminSession();
  redirect(session ? "/admin/products" : "/admin/login");
}
