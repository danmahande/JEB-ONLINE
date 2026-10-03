"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import KampalaClock from "@/components/storefront/kampala-clock";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import type { RegionConfig } from "@/lib/types";

/* Owner-directed restoration (Round 23): the navy ticker strip above the
   bar lived here from 59c01c2 until 8477ce5 deleted it as a drive-by while
   fixing the CartDrawer. Two of its lines are owner-mandated and now LIVE:
   - SERVING: the served countries, derived from the RegionConfig rows the
     storefront already fetches from /api/fx (never a hardcoded list — a
     corridor joins the ticker the moment it joins the DB).
   - LIVE FX: 1 USD ≈ each corridor currency, from the same feed. /api/fx
     refreshes rateToUsd from open.er-api.com on a 6h TTL (src/lib/fx.ts),
     so these numbers are the real market rates the checkout charges.
   The strip collapses on scroll and carries the Kampala clock masked into
   its right edge — both verbatim from the original design. */

/* The store's single search (Option A) — PERSISTENT: always open,
   no grip button, no collapse choreography. One component, two
   mounts: inline in the header bar on md+, full-width row under
   the bar on mobile. Both share the one query state owned by the
   storefront, so typing in either filters the same rack. */
function SearchField({
  query,
  onQuery,
  onSubmit,
  className,
}: {
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) onSubmit();
      }}
      className={`ms-hsearch ${className ?? ""}`}
    >
      <span className="ms-hsearch-mark" aria-hidden="true">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="SEARCH CATALOG…"
        className="ms-hsearch-input"
        aria-label="Search products"
      />
      <button type="submit" className="ms-hsearch-key ms-key">
        GO
      </button>
    </form>
  );
}

export default function Header({
  regions,
  onNavigate,
  onOpenCart,
  query,
  onQuery,
  onSearchSubmit,
}: {
  regions: RegionConfig[];
  onNavigate: (view: "shop" | "track") => void;
  onOpenCart: () => void;
  query: string;
  onQuery: (q: string) => void;
  onSearchSubmit?: () => void;
}) {
  const pathname = usePathname();
  const cartCount = useCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
  const region = useRegion((s) => s.region || '');
  const setRegion = useRegion((s) => s.setRegion);
  const hydrated = useRegion((s) => s.hasHydrated);
  const [scrolled, setScrolled] = useState(false);

  // header compresses on scroll: ticker collapses, main bar stays sticky
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = () => {
    if (!query.trim()) return;
    if (onSearchSubmit) {
      onSearchSubmit();
    } else {
      onNavigate("shop");
    }
  };

  // duty-free lane scoped to the corridors that actually quote 0% — the DRC
  // corridor is transitional and carries an estimated duty (Task 61)
  const tickerItems = [
    ...(regions.length > 0
      ? [`SERVING ${regions.map((r) => r.countryName).join(" · ")}`]
      : []),
    ...(regions.length > 0
      ? [
          `LIVE FX — 1 USD ≈ ${regions
            .filter((r) => r.currency !== "USD" && r.rateToUsd > 0)
            .map(
              (r) =>
                `${r.currency} ${Math.round(r.rateToUsd).toLocaleString("en-US")}`
            )
            .join(" · ")}`,
        ]
      : []),
    "EAC ORIGIN — 0% IMPORT DUTY ACROSS KE · TZ · RW",
    "GRAINS MILLED & SORTED IN UGANDA",
    "CROSS-BORDER FREIGHT QUOTED AT CHECKOUT",
    "BULK & WHOLESALE WELCOME",
  ];
  const ticker = [...tickerItems, ...tickerItems];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      {/* ticker — served countries + live FX from /api/fx; collapses on scroll */}
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

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
{/* Brand */}
           <div className="flex items-center gap-6">
             <Link href="/" className="flex items-center gap-2.5">
               <span className="ms-label text-ink">MERIDIAN SUPPLY</span>
             </Link>

             {/* Mobile menu hamburger */}
             <div className="md:hidden">
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <button className="p-2 rounded-md hover:bg-line">
                     <svg
                       width="24"
                       height="24"
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       className="ms-label text-ink"
                     >
                       <line x1="3" y1="6" x2="21" y2="6"></line>
                       <line x1="3" y1="12" x2="21" y2="12"></line>
                       <line x1="3" y1="18" x2="21" y2="18"></line>
                     </svg>
                   </button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-[200px] p-2">
                   <button
                     onClick={() => onNavigate("shop")}
                     className="w-full text-left ms-label p-2 rounded hover:bg-line"
                   >
                     CATALOG
                   </button>
                   <button
                     onClick={() => onNavigate("track")}
                     className="w-full text-left ms-label p-2 rounded hover:bg-line"
                   >
                     TRACK ORDER
                   </button>
                   <Link
                     href="/account"
                     className="block w-full ms-label p-2 rounded hover:bg-line"
                   >
                     ACCOUNT
                   </Link>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>

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
                   "text-brand": typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'track',
                 })}
               >
                 TRACK ORDER
               </button>
             </nav>
           </div>

          {/* Right section — ACCOUNT sits at the extreme right (owner-directed,
              the position most online stores give the account entry point) */}
          <div className="flex items-center gap-4">
            {/* Region selector */}
            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="ms-label appearance-none bg-transparent py-1.5 pl-3 pr-8 text-ink"
              >
                {regions.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.countryName}
                  </option>
                ))}
              </select>

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

            {/* Search — persistent white channel, inline in the bar (md+) */}
            <SearchField
              query={query}
              onQuery={onQuery}
              onSubmit={handleSearchSubmit}
              className="hidden md:flex w-[clamp(200px,20vw,320px)]"
            />

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
              {hydrated && cartCount > 0 && (
                <span className="ms-cart-live absolute -top-1 -right-1 w-7 h-7 rounded-full opacity-0" />
              )}
            </button>

            <Link href="/account" className="ms-label hidden md:inline-flex">
              ACCOUNT
            </Link>
          </div>
        </div>

        {/* mobile: the same persistent search as its own full-width row */}
        <div className="pb-3 md:hidden">
          <SearchField
            query={query}
            onQuery={onQuery}
            onSubmit={handleSearchSubmit}
            className="flex w-full"
          />
        </div>
      </div>
    </header>
  );
}
