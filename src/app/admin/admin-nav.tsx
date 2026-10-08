"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/operators", label: "Operators" },
];

/* Shared admin chrome — one nav bar for every /admin page. The old
   per-page link clusters disagreed with each other: the products page
   linked to Operators + Orders, the orders page linked only back to
   Products, and the operators page had no route to Orders at all.
   Hidden on the sign-in screen, where there is nothing to navigate. */
export function AdminNav() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  // Exact match for /admin itself, prefix match for its subsections — otherwise
  // an Overview entry at /admin reads as "current" on every dashboard page,
  // because /admin/products startsWith /admin.
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/admin/products"
            className="text-xs font-bold uppercase tracking-[0.18em] text-brand"
          >
            Meridian Supply · Admin
          </Link>
          <nav aria-label="Admin sections" className="flex items-center gap-5">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`border-b-2 pb-0.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  isActive(link.href)
                    ? "border-brand text-ink"
                    : "border-transparent text-hush hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-xs font-semibold uppercase tracking-wide text-hush transition-colors hover:text-ink"
          >
            View store
          </a>
          <Button
            onClick={() => void signOut({ callbackUrl: "/admin/login" })}
            type="button"
            variant="outline"
            size="sm"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
