import type { Metadata } from "next";
import TermsContent from "./terms-content";

export const metadata: Metadata = {
  title: "Terms of Service — MERIDIAN SUPPLY",
  description:
    "MERIDIAN SUPPLY Terms of Service governing use of our website and purchase agreements.",
  openGraph: {
    title: "Terms of Service — MERIDIAN SUPPLY",
    description:
      "MERIDIAN SUPPLY Terms of Service governing use of our website and purchase agreements.",
    type: "website",
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
