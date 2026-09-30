"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";

export default function ShippingContent() {
  return (
    <>
      <Header
        regions={[]}
        onNavigate={() => {}}
        onOpenCart={() => {}}
        query=""
        onQuery={() => {}}
        onSearchSubmit={() => {}}
      />
      <main className="min-h-[calc(100vh-140px)] flex flex-col">
        <div className="px-4 md:px-8 py-12 md:py-16">
          <h1 className="ms-display text-3xl md:text-4xl mb-6">
            Shipping Policy
          </h1>
          <div className="max-w-2xl">
            <p>
              Last updated: September 30, 2026
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">1. Order Processing</h2>
            <p>
              Orders are processed within 1-2 business days after payment confirmation.
              You will receive an order confirmation email with your order number and details.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">2. Shipping Methods</h2>
            <p>
              We use reputable carriers for all shipments. Available shipping options are
              displayed at checkout based on your destination and order contents.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">3. Shipping Costs</h2>
            <p>
              Shipping costs are calculated based on package weight, dimensions, destination,
              and selected shipping speed. These costs are displayed during checkout before
              final payment. Free shipping promotions, when offered, will be clearly stated.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">4. Delivery Estimates</h2>
            <p>
              Estimated delivery times are provided at checkout but are not guaranteed due
              to factors beyond our control (weather, customs delays, carrier performance).
              Typical delivery windows:
              <ul className="list-disc list-inside mt-2">
                <li>Uganda: 2-4 business days</li>
                <li>Kenya, Tanzania, Rwanda: 4-7 business days</li>
                <li>DR Congo: 7-14 business days</li>
                <li>International: 10-21 business days</li>
              </ul>
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
              Once your order ships, you will receive a shipping confirmation email with
              tracking information. Use the tracking number on the carrier's website to
              monitor your shipment's progress.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">7. Delivery Issues</h2>
            <p>
              If your shipment is marked as delivered but you have not received it, please
              contact the carrier first. If the issue persists, contact us at
              <a href="mailto:sales@meridiansupply.co" className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                sales@meridiansupply.co
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
              <a href="mailto:sales@meridiansupply.co" className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                sales@meridiansupply.co
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer
        onNavigate={(v, q) => {
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (v === 'shop') {
              if (q) params.set('q', q);
              else params.delete('q');
              window.history.replaceState({}, '', `?${params.toString()}`);
            }
            if (v === 'track') {
              window.history.replaceState({}, '', `?view=track`);
            }
          }
        }}
      />
    </>
  );
}
