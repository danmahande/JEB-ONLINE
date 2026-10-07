import type { Metadata } from "next";
import ContactContent from "./contact-content";

export const metadata: Metadata = {
  title: "Contact — MERIDIAN SUPPLY",
  description:
    "Reach the Meridian Supply Co. team: sales email, WhatsApp (when online), order tracking, and trade documentation queries.",
  openGraph: {
    title: "Contact — MERIDIAN SUPPLY",
    description:
      "Reach the Meridian Supply Co. team: sales email, WhatsApp (when online), order tracking, and trade documentation queries.",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
