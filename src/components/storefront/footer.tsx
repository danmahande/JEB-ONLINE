"use client";

export default function Footer({ onNavigate }: { onNavigate: (v: "shop" | "track") => void }) {
  return (
    <footer className="mt-auto bg-black text-white" aria-label="Footer">
      <div className="px-4 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <p className="kz-display text-4xl md:text-5xl mb-4">
              KWANZA
              <br />
              SUPPLY<sup className="text-xs align-super">®</sup>
            </p>
            <p className="text-sm leading-relaxed opacity-70 max-w-sm">
              East African grains and hardware equipment, sold across borders.
              Storefront orders flow straight into kwanza-erp for warehousing,
              last-mile delivery and reconciliation.
            </p>
          </div>

          <div>
            <p className="kz-label opacity-50 mb-4">SHOP</p>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate("shop")} className="kz-label hover:opacity-50">
                  ALL PRODUCTS
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("shop")} className="kz-label hover:opacity-50">
                  GRAINS
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("shop")} className="kz-label hover:opacity-50">
                  HARDWARE
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("track")} className="kz-label hover:opacity-50">
                  TRACK ORDER
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="kz-label opacity-50 mb-4">TRADE</p>
            <ul className="space-y-2 text-xs leading-relaxed opacity-70">
              <li>ORIGIN: KAMPALA, UGANDA</li>
              <li>MARKETS: UG · KE · TZ · RW · GLOBAL</li>
              <li>INCOTERMS: DAP / FOB KAMPALA</li>
              <li>BACKEND: KWANZA-ERP</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 px-4 md:px-8 py-4 flex flex-wrap justify-between gap-2">
        <p className="kz-label opacity-50">© {new Date().getFullYear()} KWANZA SUPPLY CO.</p>
        <p className="kz-label opacity-50">POWERED BY KWANZA-ERP — HEADLESS COMMERCE</p>
      </div>
    </footer>
  );
}
