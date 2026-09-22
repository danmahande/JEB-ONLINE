"use client";

import { useEffect, useState } from "react";
import { useCart, useRegion, useSky, type DayPart } from "@/lib/store";
import type { RegionConfig } from "@/lib/types";
import KampalaClock from "./kampala-clock";

const TICKER_ITEMS = [
  "EAC ORIGIN — 0% IMPORT DUTY WITHIN EAST AFRICA",
  "GRAINS MILLED & SORTED IN UGANDA",
  "CROSS-BORDER FREIGHT QUOTED AT CHECKOUT",
  "BULK & WHOLESALE WELCOME",
  "MULTI-CURRENCY PRICING — UGX · KES · TZS · RWF · USD",
];

/* time-band announcement prepended to the marquee (day keeps the base line-up) */
const BAND_LINE: Record<DayPart, string> = {
  dawn: "GOOD MORNING — TODAY'S HARVEST JUST LANDED",
  day: "",
  golden: "GOLDEN HOUR — ORDER BY 6PM EAT FOR NEXT-DAY DISPATCH IN KAMPALA",
  night: "OVERNIGHT ORDERS PICKED & PACKED BY DAWN",
};

export default function Header({
  regions,
  onNavigate,
  onOpenCart,
}: {
  regions: RegionConfig[];
  onNavigate: (view: "shop" | "track") => void;
  onOpenCart: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const region = useRegion((s) => s.region);
  const setRegion = useRegion((s) => s.setRegion);
  const [regionOpen, setRegionOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // header compresses on scroll: ticker collapses, main bar gains a shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const active = regions.find((r) => r.region === region);
  const skyOverride = useSky((s) => s.override);
  const skyNatural = useSky((s) => s.natural);
  const band = skyOverride ?? skyNatural;
  const base =
    band !== "day" && BAND_LINE[band] ? [BAND_LINE[band], ...TICKER_ITEMS] : TICKER_ITEMS;
  const ticker = [...base, ...base];

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* ticker — collapses when the page scrolls */}
      <div
        className={`relative overflow-hidden bg-ink text-white transition-all duration-300 ${
          scrolled ? "max-h-0 py-0 opacity-0" : "max-h-12 py-1.5 opacity-100"
        }`}
      >
        <div className="ms-marquee-track" aria-hidden="true">
          {ticker.map((t, i) => (
            <span key={i} className="ms-label mx-8 inline-block">
              {t} <span className="ml-8 text-brand">●</span>
            </span>
          ))}
        </div>
        {/* live HQ clock — masked into the right edge of the marquee */}
        <div className="absolute inset-y-0 right-0 flex items-center pl-10 pr-4 md:pr-8 bg-gradient-to-r from-transparent via-ink to-ink">
          <KampalaClock />
        </div>
      </div>

      {/* main bar */}
      <div
        className={`flex items-center justify-between border-b border-line px-4 md:px-8 transition-all duration-300 ${
          scrolled ? "py-2 ms-header-scrolled" : "py-3"
        }`}
      >
        <button
          onClick={() => onNavigate("shop")}
          className="ms-display text-xl md:text-2xl tracking-tight text-left"
          aria-label="Meridian Supply home"
        >
          MERIDIAN{" "}
          <span className="hidden md:inline">
            <br />
          </span>
          SUPPLY<span className="ml-1.5 inline-block h-2 w-2 bg-brand align-middle" aria-hidden="true" />
        </button>

        <nav className="hidden md:flex items-center gap-8" aria-label="Main">
          <button
            onClick={() => onNavigate("shop")}
            className="ms-label hover:text-brand transition-colors"
          >
            SHOP ALL
          </button>
          <button
            onClick={() => onNavigate("track")}
            className="ms-label hover:text-brand transition-colors"
          >
            TRACK ORDER
          </button>
        </nav>

        <div className="flex items-center gap-3 md:gap-6">
          {/* region selector */}
          <div className="relative">
            <button
              onClick={() => setRegionOpen((o) => !o)}
              className="ms-label border border-line px-3 py-2 hover:bg-ink hover:text-white transition-colors"
              aria-haspopup="listbox"
              aria-expanded={regionOpen}
            >
              {active ? `${active.region} · ${active.currency}` : "REGION"}
              <span className="ml-2">▾</span>
            </button>
            {regionOpen && (
              <ul
                className="absolute right-0 mt-1 w-56 border border-line bg-white z-50 shadow-lg"
                role="listbox"
              >
                {regions.map((r) => (
                  <li key={r.region}>
                    <button
                      role="option"
                      aria-selected={r.region === region}
                      onClick={() => {
                        setRegion(r.region);
                        setRegionOpen(false);
                      }}
                      className={`ms-label w-full text-left px-3 py-3 hover:bg-ink hover:text-white transition-colors ${
                        r.region === region ? "bg-ink text-white" : ""
                      }`}
                    >
                      {r.countryName}
                      <span className="float-right">{r.currency}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* cart */}
          <button
            onClick={onOpenCart}
            data-cart-badge
            className="ms-label bg-brand text-white px-4 py-2 hover:bg-brand-dark transition-colors"
            aria-label={`Open cart, ${count} items`}
          >
            CART [<span key={count} className="ms-badge-pop inline-block">{count}</span>]
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex border-b border-line" aria-label="Mobile">
        <button
          onClick={() => onNavigate("shop")}
          className="ms-label flex-1 py-3 border-r border-line hover:bg-ink hover:text-white transition-colors"
        >
          SHOP
        </button>
        <button
          onClick={() => onNavigate("track")}
          className="ms-label flex-1 py-3 hover:bg-ink hover:text-white transition-colors"
        >
          TRACK
        </button>
      </nav>
    </header>
  );
}
