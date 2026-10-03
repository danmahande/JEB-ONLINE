import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/admin-auth";

// Session-dependent redirect: without this, NextAuth's getServerSession
// returns null during prerender (it swallows the dynamic-usage signal
// instead of throwing), Next statically bakes the no-session branch, and
// every signed-in customer clicking the header's ACCOUNT link is bounced
// back to /account/login forever. Round 23 auditor repair (offense #43).
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCustomerSession();
  redirect(session ? "/account/orders" : "/account/login");
}
