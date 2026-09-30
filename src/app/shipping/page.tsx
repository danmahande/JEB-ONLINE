import type { Metadata } from "next";
import ShippingContent from "./shipping-content";

export const metadata: Metadata = {
  title: "Shipping Policy — MERIDIAN SUPPLY",
  description:
    "MERIDIAN SUPPLY shipping policy covering delivery times, costs, and international restrictions.",
  openGraph: {
    title: "Shipping Policy — MERIDIAN SUPPLY",
    description:
      "MERIDIAN SUPPLY shipping policy covering delivery times, costs, and international restrictions.",
    type: "website",
  },
};

export default function ShippingPage() {
  return <ShippingContent />;
}
