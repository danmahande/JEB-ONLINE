import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "KWANZA SUPPLY — Grains & Hardware. Cross-Border.",
  description:
    "East African grains and hardware equipment sold across borders. Wholesale catalog, multi-currency pricing, duties and freight calculated at checkout. Powered by kwanza-erp.",
  keywords: [
    "grains wholesale",
    "hardware export",
    "East Africa trade",
    "cross-border commerce",
    "kwanza-erp",
  ],
  openGraph: {
    title: "KWANZA SUPPLY — Grains & Hardware. Cross-Border.",
    description:
      "East African grains and hardware equipment sold across borders. Powered by kwanza-erp.",
    siteName: "Kwanza Supply Co.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
