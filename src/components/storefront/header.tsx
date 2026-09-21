"use client";

import { useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import type { RegionConfig } from "@/lib/types";

const TICKER_ITEMS = [
  "EAC ORIGIN — 0% IMPORT DUTY WITHIN EAST AFRICA",
  "GRAINS MILLED & SORTED IN UGANDA",
  "CROSS-BORDER FREIGHT QUOTED AT CHECKOUT",
  "BULK & WHOLESALE WELCOME",
  "ORDERS FULFILLED VIA KWANZA-ERP",
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
      <div className="overflow-hidden bg-black text-white py-1.5" aria-hidden="true">
        <div className="kz-marquee-track">
          {ticker.map((t, i) => (
            <span key={i} className="kz-label mx-8 inline-block">
              {t} <span className="ml-8 opacity-40">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* main bar */}
      <div className="flex items-center justify-between border-b border-black px-4 py-3 md:px-8">
        <button
          onClick={() => onNavigate("shop")}
          className="kz-display text-xl md:text-2xl tracking-tight text-left"
          aria-label="Kwanza Supply home"
        >
          KWANZA{" "}
          <span className="hidden md:inline">
            <br />
          </span>
          SUPPLY<sup className="text-[10px] align-super">®</sup>
        </button>

        <nav className="hidden md:flex items-center gap-8" aria-label="Main">
          <button
            onClick={() => onNavigate("shop")}
            className="kz-label hover:opacity-50 transition-opacity"
          >
            SHOP ALL
          </button>
          <button
            onClick={() => onNavigate("track")}
            className="kz-label hover:opacity-50 transition-opacity"
          >
            TRACK ORDER
          </button>
        </nav>

        <div className="flex items-center gap-3 md:gap-6">
          {/* region selector */}
          <div className="relative">
            <button
              onClick={() => setRegionOpen((o) => !o)}
              className="kz-label border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors"
              aria-haspopup="listbox"
              aria-expanded={regionOpen}
            >
              {active ? `${active.region} · ${active.currency}` : "REGION"}
              <span className="ml-2">▾</span>
            </button>
            {regionOpen && (
              <ul
                className="absolute right-0 mt-1 w-56 border border-black bg-white z-50"
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
                      className={`kz-label w-full text-left px-3 py-3 hover:bg-black hover:text-white transition-colors ${
                        r.region === region ? "bg-black text-white" : ""
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
            className="kz-label bg-black text-white px-4 py-2 hover:opacity-80 transition-opacity"
            aria-label={`Open cart, ${count} items`}
          >
            CART [{count}]
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex border-b border-black" aria-label="Mobile">
        <button
          onClick={() => onNavigate("shop")}
          className="kz-label flex-1 py-3 border-r border-black hover:bg-black hover:text-white transition-colors"
        >
          SHOP
        </button>
        <button
          onClick={() => onNavigate("track")}
          className="kz-label flex-1 py-3 hover:bg-black hover:text-white transition-colors"
        >
          TRACK
        </button>
      </nav>
    </header>
  );
}
