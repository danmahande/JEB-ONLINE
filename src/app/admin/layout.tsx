import type { Metadata } from "next";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Store Admin | Meridian Supply",
    template: "%s | Store Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-mist text-ink"><AdminNav />{children}</div>;
}
