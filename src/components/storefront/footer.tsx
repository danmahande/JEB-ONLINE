"use client";

export default function Footer({ onNavigate }: { onNavigate: (v: "shop" | "track") => void }) {
  return (
    <footer className="mt-auto bg-ink text-white" aria-label="Footer">
      <div className="px-4 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <p className="ms-display text-4xl md:text-5xl mb-4">
              MERIDIAN
              <br />
              SUPPLY<span className="ml-2 inline-block h-2.5 w-2.5 bg-brand align-middle" aria-hidden="true" />
            </p>
            <p className="text-sm leading-relaxed opacity-70 max-w-sm">
              East African grains and hardware equipment, sold across borders.
              Orders are picked and dispatched from our Kampala warehouse with
              full cross-border documentation — from customs paperwork to
              last-mile delivery.
            </p>
          </div>

          <div>
            <p className="ms-label opacity-50 mb-4">SHOP</p>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate("shop")} className="ms-label hover:text-brand">
                  ALL PRODUCTS
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("shop")} className="ms-label hover:text-brand">
                  GRAINS
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("shop")} className="ms-label hover:text-brand">
                  HARDWARE
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("track")} className="ms-label hover:text-brand">
                  TRACK ORDER
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="ms-label opacity-50 mb-4">TRADE</p>
            <ul className="space-y-2 text-xs leading-relaxed opacity-70">
              <li>ORIGIN: KAMPALA, UGANDA</li>
              <li>MARKETS: UG · KE · TZ · RW · GLOBAL</li>
              <li>INCOTERMS: DAP / FOB KAMPALA</li>
              <li>SUPPORT: SALES@MERIDIANSUPPLY.CO</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 md:px-8 py-4 flex flex-wrap justify-between gap-2">
        <p className="ms-label opacity-50">© {new Date().getFullYear()} MERIDIAN SUPPLY CO.</p>
        <p className="ms-label opacity-50">GRAINS & HARDWARE — SOLD ACROSS BORDERS</p>
      </div>
    </footer>
  );
}
