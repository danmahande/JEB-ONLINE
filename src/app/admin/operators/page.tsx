import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOperators } from "./admin-operators";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bus cargo operators",
  robots: { index: false, follow: false },
};

export default async function AdminOperatorsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminOperators />;
}
