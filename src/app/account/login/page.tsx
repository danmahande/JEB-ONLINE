import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerLoginForm } from "@/app/account/customer-forms";
import {
  getCustomerSession,
  isCustomerAccountsConfigured,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Customer sign in | Meridian Supply Co.",
  robots: { index: false, follow: false },
};

// Same standing rule as the sibling account pages: a session-reading page must
// opt out of static prerendering. This one already rendered dynamically by
// awaiting searchParams, but stating it explicitly keeps the rule uniform and
// machine-checkable (see scripts/ci-checks.mjs).
export const dynamic = "force-dynamic";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  if (await getCustomerSession()) redirect("/account/orders");
  const params = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-12 sm:px-6">
      <Link className="text-sm font-semibold text-ink underline" href="/">
        Back to the store
      </Link>
      <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-hush">
          Meridian Supply Co.
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Customer sign in</h1>
        <p className="mt-2 text-sm leading-6 text-hush">
          Sign in to see orders you placed while signed in. You can still shop and check out as a guest.
        </p>
        {params.created === "1" ? (
          <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm text-ink" role="status">
            Your account was created. Sign in to continue.
          </p>
        ) : null}
        {isCustomerAccountsConfigured() ? (
          <CustomerLoginForm />
        ) : (
          <p className="mt-6 rounded-md border border-line bg-background p-4 text-sm text-ink">
            Customer accounts are not available yet. Please try again later.
          </p>
        )}
        <p className="mt-6 text-sm text-hush">
          New here?{" "}
          <Link className="font-semibold text-ink underline" href="/account/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
