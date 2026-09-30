"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";

export default function PrivacyContent() {
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
            Privacy Policy
          </h1>
          <div className="max-w-2xl">
            <p>
              Last updated: September 30, 2026
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Introduction</h2>
            <p>
              MERIDIAN SUPPLY ("we," "our," or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you visit our website
              <a href="/" className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                meridiansupply.co
              </a>, place an order, or otherwise interact with us (collectively, the
              <strong>Services</strong>). By accessing or using the Services, you agree to have
              read, understood, and consent to our Privacy Policy.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Information We Collect</h2>
            <p>
              We collect information you provide directly to us (e.g., name, email, phone, shipping
              and billing addresses, payment details) when you place an order, create an account,
              subscribe to our newsletter, or otherwise communicate with us. We also automatically
              collect certain information about your device and browsing behavior (e.g., IP address,
              browser type, operating system, referral URL, and actions on our site) through cookies
              and similar technologies.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">How We Use Your Information</h2>
            <p>
              We use your information to process orders, communicate with you about your purchases,
              provide customer support, improve our website and Services, send promotional
              communications (if you opt in), comply with legal obligations, and protect against
              fraud.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Sharing Your Information</h2>
            <p>
              We may share your information with service providers who assist us in operating our
              website and conducting our business (e.g., payment processors, shipping carriers,
              email service providers), as required by law (e.g., in response to subpoenas or court
              orders), or to protect our rights, privacy, safety, or property.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, delete, or
              restrict the processing of your personal data. To exercise these rights, please contact
              us at
              <a href="mailto:sales@meridiansupply.co" className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                sales@meridiansupply.co
              </a>.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Cookies and Tracking Technologies</h2>
            <p>
              Our website uses cookies and similar technologies to enhance your experience, analyze
              site traffic, and serve targeted advertisements. You can control cookie preferences
              through your browser settings.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              personal data against accidental or unlawful destruction, loss, alteration, unauthorized
              disclosure or access, and other unlawful forms of processing.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">International Transfers</h2>
            <p>
              If you are located outside Uganda, your information may be transferred to, stored, and
              processed in Uganda or other countries where we operate. By using our Services, you
              consent to such transfers.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The
              <em>Last updated</em> date at the top of this page indicates when the policy was last
              revised. Your continued use of the Services after any changes constitutes your
              acceptance of the new policy.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
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
