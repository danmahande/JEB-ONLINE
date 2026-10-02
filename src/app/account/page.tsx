import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/admin-auth";

export default async function AccountPage() {
  const session = await getCustomerSession();
  redirect(session ? "/account/orders" : "/account/login");
}
