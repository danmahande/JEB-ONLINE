"use client";

import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";
import { useStoreChrome } from "@/hooks/use-store-chrome";
import { contactMailto, CONTACT_EMAIL, SITE_DISPLAY_DOMAIN } from "@/lib/site-config";

export default function PrivacyContent() {
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
            Privacy Policy
          </h1>
          <div className="max-w-2xl">
            <p>
              Last updated: October 7, 2026
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Introduction</h2>
            <p>
              MERIDIAN SUPPLY ("we," "our," or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you visit our website
              <a href="/" className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                {SITE_DISPLAY_DOMAIN}
              </a>, place an order, or otherwise interact with us (collectively, the
              <strong>Services</strong>). By accessing or using the Services, you agree to have
              read, understood, and consent to our Privacy Policy.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Information We Collect</h2>
            <p>
              <strong>Information you give us.</strong> When you place an order we collect your
              name, email address, phone number and delivery address, together with the name and
              phone number of the person collecting the consignment at the destination terminal
              where a bus cargo operator is used. If you create an account we additionally store
              your email address and a hashed password. If you subscribe to our newsletter or ask
              to be notified when a product is back in stock, we store the email address you give us.
            </p>
            <p>
              <strong>Information we do not collect.</strong> This website does not take payment
              and never receives your card or mobile-money credentials — no payment details are
              collected or stored here. We run no analytics, advertising or third-party tracking
              scripts.
            </p>
            <p>
              <strong>Information stored in your own browser.</strong> Your cart contents and your
              selected delivery region are kept in your browser&apos;s local storage under the keys
              <code>meridian-cart</code> and <code>meridian-region</code>, so your cart survives a
              page reload. This data stays on your device; clearing your browser storage removes it.
            </p>
            <p>
              <strong>Security and rate-limiting data.</strong> To prevent abuse, sign-in and
              sign-up attempts are counted per network address in a short-lived window. The address
              is not stored in readable form: it is hashed with a server-side secret before it is
              written, and only the counter is used to throttle repeated attempts.
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
              We share what is necessary to deliver your order — the carrier or bus cargo operator
              and, where applicable, customs brokers — and with the email provider that sends order
              confirmations, where that service is enabled. We may also disclose information where
              the law requires it, or to protect our rights, privacy, safety or property.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, delete, or
              restrict the processing of your personal data. To exercise these rights, please contact
              us at
              <a href={contactMailto} className="underline underline-offset-4 decoration-line hover:decoration-brand transition-colors">
                {CONTACT_EMAIL}
              </a>.
            </p>
            <h2 className="ms-label mt-6 mb-3 text-ink">Cookies and Local Storage</h2>
            <p>
              We do not run advertising or analytics cookies, and we do not sell or share your
              information with advertising networks. If you sign in, a single strictly-necessary
              session cookie is set so the site knows you are signed in; it is required for the
              account area to work. Cart and region preferences use browser local storage rather
              than cookies. You can clear either through your browser settings, though clearing
              the session cookie will sign you out.
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
