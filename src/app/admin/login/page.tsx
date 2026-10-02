import { redirect } from "next/navigation";
import { AdminLogin } from "@/app/admin/login/sign-in-form";
import { getAdminSession, isAdminConfigured } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const configured = isAdminConfigured();
  if (configured && (await getAdminSession())) redirect("/admin/products");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-5 py-12">
      <section className="w-full rounded-md border border-line bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
          Meridian Supply · Private
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Store administration
        </h1>
        <p className="mt-2 text-sm leading-6 text-hush">
          Sign in to manage the products shown in your storefront.
        </p>

        {configured ? (
          <AdminLogin />
        ) : (
          <div
            className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            role="status"
          >
            Admin sign-in is not configured yet. Add{" "}
            <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code>, and{" "}
            <code>NEXTAUTH_SECRET</code> to the project environment before
            signing in.
          </div>
        )}

        <a
          className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-hush underline-offset-4 hover:text-ink hover:underline"
          href="/"
        >
          Return to storefront
        </a>
      </section>
    </main>
  );
}
