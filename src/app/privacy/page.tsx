import type { Metadata } from "next";
import PrivacyContent from "./privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — MERIDIAN SUPPLY",
  description:
    "MERIDIAN SUPPLY privacy policy outlining how we collect, use, and protect your personal data.",
  openGraph: {
    title: "Privacy Policy — MERIDIAN SUPPLY",
    description:
      "MERIDIAN SUPPLY privacy policy outlining how we collect, use, and protect your personal data.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
