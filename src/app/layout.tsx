import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/site";

// Amazon-style font stack: using Inter which is similar to Amazon's approach
// Amazon primarily uses a proprietary font called "Amazon Ember" with fallbacks to 
// system fonts like Arial, Tahoma, and Geneva. Inter is a close open-source alternative.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ['400', '500', '600', '700'], // Include bolder weights for headings like Amazon uses
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}