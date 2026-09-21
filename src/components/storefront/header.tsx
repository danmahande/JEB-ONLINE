"use client";

import { useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import type { RegionConfig } from "@/lib/types";

const TICKER_ITEMS = [
  "EAC ORIGIN — 0% IMPORT DUTY WITHIN EAST AFRICA",
  "GRAINS MILLED & SORTED IN UGANDA",
  "CROSS-BORDER FREIGHT QUOTED AT CHECKOUT",
  "BULK & WHOLESALE WELCOME",
  "MULTI-CURRENCY PRICING — UGX · KES · TZS · RWF · USD",
];

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

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const active = regions.find((r) => r.region === region);
  const ticker = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* ticker */}
      <div className="overflow-hidden bg-ink text-white py-1.5" aria-hidden="true">
        <div className="ms-marquee-track">
          {ticker.map((t, i) => (
            <span key={i} className="ms-label mx-8 inline-block">
              {t} <span className="ml-8 text-brand">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* main bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 md:px-8">
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
            className="ms-label bg-brand text-white px-4 py-2 hover:bg-brand-dark transition-colors"
            aria-label={`Open cart, ${count} items`}
          >
            CART [{count}]
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
