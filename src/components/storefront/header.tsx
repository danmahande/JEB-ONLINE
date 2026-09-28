"use client";

import { useEffect, useRef, useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { usePathname } from "next/navigation";
import type { RegionConfig } from "@/lib/types";
import { clsx } from "clsx";
import KampalaClock from "./kampala-clock";
import Link from "next/link";

const TICKER_ITEMS = [
  // duty-free lane scoped to the corridors that actually quote 0% — the DRC
  // corridor is transitional and carries an estimated duty (Task 61)
  "EAC ORIGIN — 0% IMPORT DUTY ACROSS KE · TZ · RW",
  "GRAINS MILLED & SORTED IN UGANDA",
  "CROSS-BORDER FREIGHT QUOTED AT CHECKOUT",
  "BULK & WHOLESALE WELCOME",
  "MULTI-CURRENCY PRICING — UGX · KES · TZS · RWF · CDF · USD",
];

export default function Header({
  regions,
  onNavigate,
  onOpenCart,
  query,
  onQuery,
}: {
  regions: RegionConfig[];
  onNavigate: (view: "shop" | "track") => void;
  onOpenCart: () => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const cartHasHydrated = useCart((s) => s.hasHydrated);
  const region = useRegion((s) => s.region);
  const setRegion = useRegion((s) => s.setRegion);
  const [regionOpen, setRegionOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeated, setSearchSeated] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasHydrated = useRegion((s) => s.hasHydrated);
  const [isChangingRegion, setIsChangingRegion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cartCount = lines.reduce((sum, l) => sum + l.qty, 0);

  // opening the channel hands focus straight to the well
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Close the search when clicking outside
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);

  const handleRegionChange = (newRegion: string) => {
    setIsChangingRegion(true);
    setRegion(newRegion);
    // Reset loading indicator after a short delay
    setTimeout(() => setIsChangingRegion(false), 500);
  };

  // header compresses on scroll: ticker collapses, main bar gains a shadow
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setSearchSeated(y > 200);
      if (y <= 200) setSearchOpen(false); // channel can't stay open while retracted
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = regions.find((r) => r.region === region);
  const ticker = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
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
      <div className="container mx-auto px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="ms-label text-ink">MERIDIAN SUPPLY</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <button
                onClick={() => onNavigate("shop")}
                className={clsx("ms-label", {
                  "text-brand": pathname === "/" || pathname.startsWith("/p"),
                })}
              >
                CATALOG
              </button>
              <button
                onClick={() => onNavigate("track")}
                className={clsx("ms-label", {
                  "text-brand": pathname.includes("track"),
                })}
              >
                TRACK ORDER
              </button>
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Region selector with loading indicator */}
            <div className="relative" ref={ref}>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="ms-label appearance-none bg-transparent py-1.5 pl-3 pr-8 text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                disabled={isChangingRegion}
              >
                {regions.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.countryName}
                  </option>
                ))}
              </select>
              
              {/* Loading indicator when changing region */}
              {isChangingRegion && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-ink"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

        {/* search — a machined square on the rail that slides open into
            a steel channel; the nav hands over its space while it does.
            No permanent seat: retracted until the page scrolls (Task 54). */}
            {/* Search */}
            <div
              className={`ms-hsearch ${searchOpen ? "is-open" : ""}`}
              onFocus={() => setSearchOpen(true)}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="SEARCH…"
                className="ms-search-input ms-field"
                aria-label="Search products"
              />
              <div className="ms-hsearch-grip">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icon-search"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icon-close"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <button
                onClick={() => {
                  if (query.trim()) {
                    onNavigate("shop");
                  }
                }}
                className="ms-hsearch-key ms-key"
              >
                GO
              </button>
            </div>

            {/* Cart */}
            <button
              onClick={onOpenCart}
              className="relative"
              aria-label={`Open cart (${cartCount} items)`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              
              {/* Cart badge with animation */}
              {cartCount > 0 && (
                <span className="ms-badge-pop absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
              
              {/* Cart live indicator when hydrated and has items */}
              {hasHydrated && cartCount > 0 && (
                <span className="ms-cart-live absolute -top-1 -right-1 w-7 h-7 rounded-full opacity-0" />
              )}
            </button>

            {/* Clock */}
            <KampalaClock />
          </div>
        </div>
      </div>
    </header>
    
    <CartDrawer
      open={searchOpen}
      onOpenChange={setSearchOpen}
      regions={regions}
      region={region}
      onCheckout={() => {
        setSearchOpen(false);
        onNavigate("shop");
        // Navigate to checkout
        if (typeof window !== 'undefined') {
          window.location.hash = '#checkout';
        }
      }}
    />
  </div>
  );
}
