import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/site";

// Type system (owner decision, round 7): Amazon-style look with Inter as
// the sole face — the standard open-source stand-in for Amazon's
// proprietary display font, whose name appears in no CSS stack because a
// font none of our visitors have renders for nobody. The former display
// face (Space Grotesk, --font-display) is retired; every ms-* primitive
// inherits Inter through --font-body. Self-hosted by next/font — zero
// runtime requests. No weight pin: Inter ships variable, and the steel
// system uses weights up to 800 (.ms-weight-toggle / .ms-chip).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MERIDIAN SUPPLY — Grains & Hardware. Cross-Border.",
  description:
    "East African grains and hardware equipment sold across borders. Wholesale catalog, multi-currency pricing, duties and freight calculated at checkout.",
  keywords: [
    "grains wholesale",
    "hardware export",
    "East Africa trade",
    "cross-border commerce",
  ],
  openGraph: {
    title: "MERIDIAN SUPPLY — Grains & Hardware. Cross-Border.",
    description:
      "East African grains and hardware equipment sold across borders. One catalog, five currencies, transparent duties and freight.",
    siteName: "Meridian Supply Co.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // schema.org Organization — site-wide identity shard for crawlers
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Meridian Supply Co.",
    url: SITE_URL,
    description:
      "East African grains and hardware equipment exported across the EAC and worldwide with duties, levies and freight quoted upfront.",
  };

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased bg-background text-foreground">
        {/* Skip link for accessibility */}
        <a
          id="skip-main"
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
