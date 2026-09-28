import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/site";

// Trending industrial pairing: Space Grotesk (display / labels / prices)
// + Inter (body). Self-hosted by next/font — zero runtime requests.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
    <html
  lang="en"
  suppressHydrationWarning
  className={`${spaceGrotesk.variable} ${inter.variable}`}
>
      <body className="antialiased bg-background text-foreground">
        {/* Skip link for accessibility — first element in the DOM, so the
            first Tab press lands on it and Tailwind's focus:not-sr-only
            reveals it. No JS needed: an onKeyDown here would crash the
            render — event handlers cannot cross the server-component line. */}
        <a 
          id="skip-main" 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
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