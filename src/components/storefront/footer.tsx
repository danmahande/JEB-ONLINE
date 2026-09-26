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
          </div>

          {/* index */}
          <nav aria-label="Footer">
            <p className="ms-label mb-4 text-white/40">SHOP</p>
            <ul className="space-y-2.5">
              {(
                [
                  ["ALL PRODUCTS", "shop"],
                  ["GRAINS", "shop"],
                  ["HARDWARE", "shop"],
                  ["TRACK ORDER", "track"],
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

          {/* spec sheet — two-tone data rows, the catalogue-card voice */}
          <div>
            <p className="ms-label mb-4 text-white/40">TRADE</p>
            <ul className="space-y-2.5">
              {(
                [
                  ["ORIGIN", "KAMPALA, UGANDA"],
                  ["MARKETS", "UG · KE · TZ · RW · DRC · GLOBAL"],
                  ["INCOTERMS", "DAP / FOB KAMPALA"],
                  ["SUPPORT", "SALES@MERIDIANSUPPLY.CO"],
                ] as const
              ).map(([k, v]) => (
                <li key={k} className="ms-label flex gap-3 leading-[1.7]">
                  <span className="w-[86px] shrink-0 text-white/35">{k}</span>
                  <span className="text-white/75">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 md:px-8">
        <p className="ms-label text-white/50">© {new Date().getFullYear()} MERIDIAN SUPPLY CO.</p>
        <p className="ms-label text-white/50">GRAINS &amp; HARDWARE — SOLD ACROSS BORDERS</p>
      </div>
    </footer>
  );
}
