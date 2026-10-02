import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerSignupForm } from "@/app/account/customer-forms";
import {
  getCustomerSession,
  isCustomerAccountsConfigured,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Create a customer account | Meridian Supply Co.",
  robots: { index: false, follow: false },
};

export default async function CustomerSignupPage() {
  if (await getCustomerSession()) redirect("/account/orders");

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-12 sm:px-6">
      <Link className="text-sm font-semibold text-ink underline" href="/">
        Back to the store
      </Link>
      <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-hush">
          Meridian Supply Co.
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-hush">
          Your account is ready as soon as you sign up. Shopping remains open to guests.
        </p>
        {isCustomerAccountsConfigured() ? (
          <CustomerSignupForm />
        ) : (
          <p className="mt-6 rounded-md border border-line bg-background p-4 text-sm text-ink">
            Customer accounts are not available yet. Please try again later.
          </p>
        )}
        <p className="mt-6 text-sm text-hush">
          Already have an account?{" "}
          <Link className="font-semibold text-ink underline" href="/account/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
