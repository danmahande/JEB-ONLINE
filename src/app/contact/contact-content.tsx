"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";
import { useStoreChrome } from "@/hooks/use-store-chrome";
import { contactMailto, CONTACT_EMAIL } from "@/lib/site-config";

/* Round 26: a real contact page. Honesty rule (owner decision, round 5)
   applies here too — only contact channels that actually exist are shown.
   The WhatsApp button renders ONLY when NEXT_PUBLIC_WHATSAPP_NUMBER is set
   in the environment (digits in international format, no "+"); until the
   owner publishes a number the page says so plainly instead of faking it. */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "");

export default function ContactContent() {
  const chrome = useStoreChrome();
  return (
    <>
      <Header
        regions={chrome.regions}
        onNavigate={chrome.navigate}
        onOpenCart={chrome.openCart}
        query={chrome.query}
        onQuery={chrome.setQuery}
        onSearchSubmit={chrome.submitSearch}
      />
      <main className="min-h-[calc(100vh-140px)] flex flex-col">
        <div className="px-4 md:px-8 py-12 md:py-16">
          <h1 className="ms-display text-3xl md:text-4xl mb-6">CONTACT SALES</h1>
          <div className="max-w-2xl space-y-6">
            <p className="text-[15px] leading-[24px] text-ink">
              Grain lots, hardware equipment, cross-border quotes or customs
              paperwork — the fastest answer comes by email. Orders placed on
              this site can be tracked any time with the order number.
            </p>

            <div className="rounded-lg border border-line bg-white p-5">
              <p className="ms-label mb-2 text-hush">EMAIL</p>
              <a
                className="ms-price text-lg underline decoration-line underline-offset-4 hover:decoration-brand transition-colors"
                href={contactMailto}
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-hush">
                Trade quotes, invoices and customs documentation.
              </p>
            </div>

            {WHATSAPP_NUMBER ? (
              <div className="rounded-lg border border-line bg-white p-5">
                <p className="ms-label mb-2 text-hush">WHATSAPP</p>
                <a
                  className="ms-price text-lg underline decoration-line underline-offset-4 hover:decoration-brand transition-colors"
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Chat with our sales desk
                </a>
                <p className="mt-2 text-sm text-hush">
                  Order updates and stock checks on the move.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-white p-5">
                <p className="ms-label mb-2 text-hush">WHATSAPP</p>
                <p className="text-sm leading-relaxed text-ink">
                  Not online yet — we&apos;re wiring it up. Email us in the
                  meantime and we&apos;ll reply the same business day.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-line bg-white p-5">
              <p className="ms-label mb-2 text-hush">ORDERS &amp; TRACKING</p>
              <a
                className="ms-price text-lg underline decoration-line underline-offset-4 hover:decoration-brand transition-colors"
                href="/?view=track"
              >
                Track an order →
              </a>
              <p className="mt-2 text-sm text-hush">
                Use your DS-order number or the TRK tracking number from your
                confirmation.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-white p-5">
              <p className="ms-label mb-3 text-hush">THE FINE PRINT</p>
              <ul className="space-y-2 text-sm">
                {(
                  [
                    ["PRIVACY POLICY", "/privacy"],
                    ["TERMS OF SERVICE", "/terms"],
                    ["SHIPPING POLICY", "/shipping"],
                  ] as const
                ).map(([label, href]) => (
                  <li key={href}>
                    <a
                      className="ms-label underline decoration-line underline-offset-4 hover:decoration-brand transition-colors"
                      href={href}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer onNavigate={chrome.footerNavigate} />
    </>
  );
}
