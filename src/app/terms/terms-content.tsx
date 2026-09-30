"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";

export default function TermsContent() {
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
            Terms of Service
          </h1>
          <div className="prose prose-sm md:prose-lg max-w-2xl">
            <p>
              Last updated: September 30, 2026
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of
              meridiansupply.co and any related services provided by MERIDIAN SUPPLY.
              By accessing or using our Services, you agree to be bound by these Terms.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">2. Products and Services</h2>
            <p>
              We offer grains and hardware equipment for sale. Product descriptions, pricing,
              availability, and shipping estimates are provided for informational purposes only.
              We reserve the right to modify product offerings, correct errors, or change prices
              at any time without prior notice.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">3. Ordering and Payment</h2>
            <p>
              When you place an order, you represent and warrant that all information you provide
              is true, accurate, and current. Payment is due at the time of purchase. We accept
              MTN MOMO, M-PESA, AIRTEL MONEY, bank transfers, and cash on delivery (EAC region
              only). Shipping costs, duties, VAT, and other fees are calculated at checkout and
              displayed before final payment.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">4. Shipping and Delivery</h2>
            <p>
              Products are shipped from our warehouse in Kampala, Uganda. Estimated delivery times
              are provided at checkout but are not guaranteed due to factors beyond our control (weather,
              customs delays, carrier performance). Typical delivery windows:
              <ul className="list-disc list-inside mt-2">
                <li>Uganda: 2-4 business days</li>
                <li>Kenya, Tanzania, Rwanda: 4-7 business days</li>
                <li>DR Congo: 7-14 business days</li>
                <li>International: 10-21 business days</li>
              </ul>
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">5. Delivery Area</h2>
            <p>
              We deliver to all 6 registered regions (UG, KE, TZ, RW, DRC, INTL) and worldwide.
              Cash on delivery is only available for EAC member countries.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">6. Returns and Refunds</h2>
            <p>
              Please review our Return Policy separately. Items may be returned subject to the
              conditions set forth in that policy.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">7. Account Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and for
              all activities that occur under your account, whether or not you have authorized
              such activities.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">8. Prohibited Activities</h2>
            <p>
              You shall not: (a) violate any laws or regulations; (b) impersonate any person or
              entity; (c) intercept or collect others' personally identifiable information; (d)
              interfere with or disrupt our Services; or (e) engage in unauthorized activities.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MERIDIAN SUPPLY SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR FOR
              ANY DAMAGES FOR LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL ARISING OUT OF OR IN
              CONNECTION WITH THE SERVICES.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Uganda, without regard to its conflict of
              law principles. Any dispute arising from your use of the Services shall be resolved
              in the courts of Uganda.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">11. Changes to Terms</h2>
            <p>
              We may revise these Terms at any time. Changes are effective upon posting to our
              website. Your continued use of the Services after any changes constitutes acceptance
              of the revised Terms.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">12. Contact Us</h2>
            <p>
              For questions regarding these Terms, please contact:
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
