"use client";

import Reveal from "@/components/storefront/reveal";

/* Task 58 — the footer joins the design system for real.
   Material: a machined steel head rail (same paint as the shopfront
   frame) landing the page onto the ink back-wall. Type: px-exact
   gauges per the Task 57 regime — Space Grotesk display wordmark,
   ms-label chrome, 13px Inter body — so the 85% html dial can't
   shrink any of it. The day/night selector is gone: the storefront
   lives in permanent daylight, and this bar carries only legal line
   and tagline. */
export default function Footer({ onNavigate }: { onNavigate: (v: "shop" | "track") => void }) {
  return (
    <footer className="mt-auto bg-ink text-white" aria-label="Footer">
      {/* the back wall's steel head — bolted on with the shopfront's
          own frame steel so the dark block reads as store hardware,
          not an unstyled end-cap */}
      <div className="ms-footer-rail" aria-hidden="true" />

      <div className="px-4 md:px-8 py-12 md:py-16">
        <Reveal className="grid gap-10 md:grid-cols-4">
          {/* brand plate */}
          <div className="md:col-span-2">
            <p className="ms-display mb-1 text-[36px] md:text-[48px]">
              MERIDIAN
              <br />
              SUPPLY<span className="ml-2 inline-block h-2.5 w-2.5 bg-brand align-middle" aria-hidden="true" />
            </p>
            <p className="ms-label mb-5 text-white/40">GRAINS &amp; HARDWARE — EST. KAMPALA</p>
            <p className="max-w-sm text-[13px] leading-[21px] text-white/65">
              East African grains and hardware equipment, sold across borders.
              Orders are picked and dispatched from our Kampala warehouse with
              full cross-border documentation — from customs paperwork to
              last-mile delivery.
            </p>
            {/* Newsletter signup */}
            <div className="mt-6 max-w-sm">
              <p className="ms-label mb-3 text-white/60">JOIN OUR NEWSLETTER</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="ms-field flex-1 text-xs py-2 px-3 text-white bg-white/10 border-white/20 placeholder:text-white/40"
                />
                <button className="ms-key ms-label px-4 py-2 text-xs whitespace-nowrap">SUBSCRIBE</button>
              </div>
              <p className="ms-label mt-2 text-white/40 text-xs">Receive updates on new products and promotions</p>
            </div>
          </div>

          {/* Shop Navigation */}
          <nav aria-label="Shop Navigation">
            <p className="ms-label mb-4 text-white/40">SHOP</p>
            <ul className="space-y-2.5">
              {(
                [
                  ["All Products", "shop"],
                  ["Grains", "shop"],
                  ["Hardware", "shop"],
                  ["New Arrivals", "shop"],
                  ["Best Sellers", "shop"],
                  ["Track Order", "track"],
                ] as const
              ).map(([label, target]) => (
                <li key={label}>
                  <button
                    onClick={() => onNavigate(target)}
                    className="group ms-label flex items-center gap-2.5 text-white/80 transition-colors hover:text-brand"
                  >
                    <span
                      className="inline-block h-1 w-1 bg-white/30 transition-colors group-hover:bg-brand"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company Info */}
          <div>
            <p className="ms-label mb-4 text-white/40">COMPANY</p>
            <ul className="space-y-2.5">
              {(
                [
                  ["About Us", "shop"],
                  ["Contact", "shop"],
                  ["Shipping Policy", "shop"],
                  ["Returns & Refunds", "shop"],
                  ["FAQ", "shop"],
                  ["Careers", "shop"],
                ] as const
              ).map(([label, target]) => (
                <li key={label}>
                  <button
                    onClick={() => onNavigate(target)}
                    className="group ms-label flex items-center gap-2.5 text-white/80 transition-colors hover:text-brand"
                  >
                    <span
                      className="inline-block h-1 w-1 bg-white/30 transition-colors group-hover:bg-brand"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Divider */}
        <div className="my-10 border-t border-white/10"></div>

        {/* Trade Specs */}
        <Reveal delay={100}>
          <div className="md:grid md:grid-cols-2 gap-10">
            <div>
              <p className="ms-label mb-4 text-white/40">TRADE SPECIFICATIONS</p>
              <ul className="space-y-3">
                {(
                  [
                    ["Origin", "Kampala, Uganda"],
                    ["Markets", "UG · KE · TZ · RW · DRC · Global"],
                    ["Incoterms", "DAP / FOB Kampala"],
                    ["Certifications", "EAC, ISO 9001"],
                    ["Payment Methods", "Bank Transfer, Mobile Money"],
                    ["Support", "sales@meridiansupply.co"],
                  ] as const
                ).map(([k, v]) => (
                  <li key={k} className="ms-label flex gap-3 leading-[1.7]">
                    <span className="w-[100px] shrink-0 text-white/35">{k}</span>
                    <span className="text-white/75">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <p className="ms-label mb-4 text-white/40">CONTACT INFO</p>
              <ul className="space-y-3">
                {([
                  ["Address", "Plot 123, Industrial Area, Kampala, Uganda"],
                  ["Phone", "+256 700 000 000"],
                  ["Email", "sales@meridiansupply.co"],
                  ["Warehouse Hours", "Mon-Fri: 8am-5pm EAT"],
                ] as const).map(([k, v]) => (
                  <li key={k} className="ms-label flex gap-3 leading-[1.7]">
                    <span className="w-[100px] shrink-0 text-white/35">{k}</span>
                    <span className="text-white/75">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 md:px-8">
        <div className="flex flex-wrap gap-4 text-sm text-white/50">
          <span>© {new Date().getFullYear()} MERIDIAN SUPPLY CO.</span>
          <button className="hover:text-brand transition-colors">Privacy Policy</button>
          <button className="hover:text-brand transition-colors">Terms of Service</button>
          <button className="hover:text-brand transition-colors">Cookie Policy</button>
        </div>
        <div className="flex items-center gap-4">
          <button className="ms-label text-white/50 hover:text-brand transition-colors">GRAINS &amp; HARDWARE — SOLD ACROSS BORDERS</button>
          {/* Social Media Icons */}
          <div className="flex gap-3">
            <button className="w-6 h-6 flex items-center justify-center hover:text-brand transition-colors" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button className="w-6 h-6 flex items-center justify-center hover:text-brand transition-colors" aria-label="Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </button>
            <button className="w-6 h-6 flex items-center justify-center hover:text-brand transition-colors" aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}