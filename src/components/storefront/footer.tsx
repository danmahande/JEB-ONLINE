"use client";

import Reveal from "@/components/storefront/reveal";
import { useSky, type DayPart } from "@/lib/store";

const SKY_OPTIONS: { key: string; value: DayPart | null }[] = [
  { key: "AUTO", value: null },
  { key: "DAWN", value: "dawn" },
  { key: "DAY", value: "day" },
  { key: "GOLDEN", value: "golden" },
  { key: "NIGHT", value: "night" },
];

export default function Footer({ onNavigate }: { onNavigate: (v: "shop" | "track") => void }) {
  const override = useSky((s) => s.override);
  const setOverride = useSky((s) => s.setOverride);
  return (
    <footer className="mt-auto bg-ink text-white" aria-label="Footer">
      <div className="px-4 md:px-8 py-12 md:py-16">
        <Reveal className="grid md:grid-cols-4 gap-10">
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
        </Reveal>
      </div>

      <div className="border-t border-white/10 px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="ms-label opacity-50">© {new Date().getFullYear()} MERIDIAN SUPPLY CO.</p>
        {/* sky override — demo every mood of the living sky, any hour */}
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Preview the storefront sky at different times of day"
        >
          <span className="ms-label opacity-50 mr-1 hidden sm:inline">SKY</span>
          {SKY_OPTIONS.map((o) => {
            const on = o.value === null ? override === null : override === o.value;
            return (
              <button
                key={o.key}
                onClick={() => setOverride(o.value)}
                aria-pressed={on}
                className={`ms-label px-2 py-1 border transition-colors ${
                  on ? "border-brand text-brand" : "border-transparent text-white/40 hover:text-white"
                }`}
              >
                {o.key}
              </button>
            );
          })}
        </div>
        <p className="ms-label opacity-50">GRAINS & HARDWARE — SOLD ACROSS BORDERS</p>
      </div>
    </footer>
  );
}
