"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";
import { useStoreChrome } from "@/hooks/use-store-chrome";
import { contactMailto, CONTACT_EMAIL } from "@/lib/site-config";

export default function ShippingContent() {
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
          <h1 className="ms-display text-3xl md:text-4xl mb-6">
            Shipping Policy
          </h1>
          <div className="max-w-2xl">
            <p>
              Last updated: October 7, 2026
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">1. Order Processing</h2>
            <p>
              Orders are processed within 1-2 business days. Nothing is charged on this
              website: we review the order, confirm stock and freight with you, and agree
              payment before anything is dispatched. Your order number is shown on screen as
              soon as the order is placed — keep it, it is how you track the order. Where order
              email is enabled we also send a confirmation to the address you provided.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">2. Shipping Methods</h2>
            <p>
              East African Community destinations travel as bus cargo with named
              operators (Link Bus, Volcano Express, Riverside Shuttle, Virunga
              Express and others). At checkout you pick the operator that carries
              your consignment — freight is that operator&apos;s tariff, a per-kilo
              rate with a per-consignment minimum — and you name the receiver who
              collects it at the destination bus terminal under the operator&apos;s
              waybill. International destinations are quoted at standard forwarder
              rates. The operator list and tariffs are displayed at checkout based
              on your destination.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">3. Shipping Costs</h2>
            <p>
              Shipping cost is calculated from the weight of your consignment, your destination
              and — for EAC corridors — the bus cargo operator you choose. The full breakdown of
              the tariff is displayed during checkout before you submit the order.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">4. Delivery Estimates</h2>
            <p>
              Estimated delivery times are provided at checkout but are not guaranteed due
              to factors beyond our control (weather, customs delays, carrier performance).
              Typical delivery windows:
              <ul className="list-disc list-inside mt-2">
                <li>Uganda: 1-2 business days</li>
                <li>Kenya, Rwanda: 2-4 business days</li>
                <li>Tanzania: 3-5 business days</li>
                <li>DR Congo: 4-7 business days</li>
                <li>International: 10-21 business days</li>
              </ul>
              Where your corridor is served by a bus cargo operator, that operator&apos;s own
              transit window is quoted at checkout instead.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">5. Cross-Border Considerations</h2>
            <p>
              For international shipments, you are responsible for any import duties, taxes,
              or customs fees imposed by the destination country. We provide commercial
              invoices and other necessary documentation to facilitate customs clearance.
              Within the East African Community (EAC), qualifying goods benefit from reduced
              or zero duties under the Customs Union.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">6. Tracking Information</h2>
            <p>
              You can follow your consignment at any time from the TRACK ORDER page using your
              order number or tracking number — the status is read live from our order record.
              Where order email is enabled we also send a shipping confirmation with the tracking
              number once the consignment is on the way; with a named bus operator you can also
              quote that number at the operator&apos;s desk.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">7. Delivery Issues</h2>
            <p>
              If your consignment is marked as delivered but you have not received it, check the
              TRACK ORDER page first, then contact the operator or carrier named on your order.
              If the issue persists, contact us at
              <a href={contactMailto} className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                {CONTACT_EMAIL}
              </a> with your order number and tracking information.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">8. Address Accuracy</h2>
            <p>
              Please ensure your shipping address is complete and accurate. We are not
              responsible for delays or returned shipments caused by incorrect or
              insufficient address information provided by the customer.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">9. Restricted Items</h2>
            <p>
              Certain items may be subject to export restrictions or require special permits.
              We will notify you if any item in your order cannot be shipped to your
              destination due to legal restrictions.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">10. Contact Us</h2>
            <p>
              For shipping-related inquiries, please contact:
            </p>
            <p>
              <a href={contactMailto} className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer onNavigate={chrome.footerNavigate} />
    </>
  );
}
