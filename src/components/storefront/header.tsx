import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart, useRegion } from "@/lib/store";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import KampalaClock from "@/components/storefront/kampala-clock";
import type { RegionConfig } from "@/lib/types";

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
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close the search when clicking outside
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);

  // Handle Escape key to close search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focused) {
        setFocused(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focused]);

  // Show loading indicator when changing regions
  const [isChangingRegion, setIsChangingRegion] = useState(false);
  
  const handleRegionChange = (newRegion: string) => {
    setIsChangingRegion(true);
    setRegion(newRegion);
    // Reset loading indicator after a short delay
    setTimeout(() => setIsChangingRegion(false), 500);
  };

  const handleGoClick = () => {
    if (query.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit();
      } else {
        onNavigate("shop");
      }
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
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
                  "text-brand": typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'track',
                })}
              >
                TRACK ORDER
              </button>
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Region selector with loading indicator */}
            <div className="relative" ref={regionRef}>
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

            {/* Search */}
            <div
              className={`ms-hsearch ${focused ? "is-open" : ""}`}
              ref={searchContainerRef}
              onClick={() => !focused && setFocused(true)} // Allow click to open
            >
              <input
                type="text"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="SEARCH…"
                className="ms-search-input ms-field"
                aria-label="Search products"
                tabIndex={focused ? 0 : -1} // Manage tab focus
              />
              <div 
                className="ms-hsearch-grip cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent search container click
                  setFocused(!focused);
                }}
              >
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
                </svg>
              </div>
              <button
                onClick={handleGoClick}
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
              {hydrated && cartCount > 0 && (
                <span className="ms-cart-live absolute -top-1 -right-1 w-7 h-7 rounded-full opacity-0" />
              )}
            </button>

            {/* Clock */}
            <KampalaClock />
          </div>
        </div>
      </div>
    </header>
  );
}