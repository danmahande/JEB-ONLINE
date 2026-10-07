"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart, useRegion } from "@/lib/store";
import { useCatalog } from "@/hooks/use-catalog";
import Header from "@/components/storefront/header";
import Hero from "@/components/storefront/hero";
import ProductGrid from "@/components/storefront/product-grid";
import QuickView from "@/components/storefront/quick-view";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import Checkout from "@/components/storefront/checkout";
import Confirmation from "@/components/storefront/confirmation";
import TrackOrder from "@/components/storefront/track-order";
import Reveal from "@/components/storefront/reveal";
import FlyDot from "@/components/storefront/fly-dot";
import Footer from "@/components/storefront/footer";
import ErrorBoundary from "@/components/error-boundary";
import type { PlacedOrder, Product } from "@/lib/types";

type View = "shop" | "checkout" | "confirmation" | "track";

/* Customer reviews — populated ONLY with real, published reviews from
   real customers (written permission on file). An empty list renders
   the honest "nothing published yet" state. Owner decision, round 5:
   no invented quotes, no fabricated stars, ever. */
const REVIEWS: { quote: string; author: string; company: string }[] = [];

// Custom hook for managing view state with URL sync
function useViewState() {
  const readView = (): View => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "track" || v === "checkout" || v === "confirmation") {
      return v as View;
    }
    return "shop";
  };

  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      return readView();
    }
    return "shop";
  });

  const updateView = useCallback((newView: View) => {
    setView(newView);

    // Update URL WITHOUT page refresh. pushState, not replaceState: the
    // browser Back button must walk the customer back through the store
    // (checkout -> shop) instead of out of the site entirely.
    const params = new URLSearchParams(window.location.search);
    params.set("view", newView);
    window.history.pushState({}, "", `?${params.toString()}`);
  }, []);

  // Back/Forward rewrite the URL behind React's back — re-sync the rendered
  // view from it. (The search query needs no popstate sync: popstate never
  // reloads the document, so the in-memory query already matches.)
  useEffect(() => {
    const onPopState = () => setView(readView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return [view, updateView] as const;
}

// Custom hook for search query management
function useSearchQuery() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) return q;
    }
    return "";
  });

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    // Update URL without page refresh
    const params = new URLSearchParams(window.location.search);
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    window.history.replaceState({}, "", `?${params.toString()}`);
  }, []);

  return [query, updateQuery] as const;
}

export default function Storefront() {
  const { products, regions, loading, error, retry } = useCatalog();
  const cartLines = useCart((s) => s.lines);
  const region = useRegion((s) => s.region);
  const { toast } = useToast();

  const [view, setView] = useViewState();
  const [query, setQuery] = useSearchQuery();
  
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  // Hydration management
  useEffect(() => {
    useCart.setState({ hasHydrated: true });
    useRegion.setState({ hasHydrated: true });
  }, []);

  // Scroll to top utility function
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goShop = useCallback(() => {
    setView("shop");
    scrollToTop();
  }, [setView, scrollToTop]);

  const goTrack = useCallback(() => {
    setView("track");
    scrollToTop();
  }, [setView, scrollToTop]);

  /* Footer SHOP links: category queries ride the same ?q= filter the
     search bar uses — GRAINS lands on the grains rack, not a lie. */
  const goShopQuery = useCallback(
    (q?: string) => {
      setView("shop");
      if (q) {
        setQuery(q);
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
      } else {
        scrollToTop();
      }
    },
    [setView, setQuery, scrollToTop]
  );

  const handleAdded = useCallback(() => {
    toast({ 
      title: "ADDED TO CART", 
      description: "Open the cart to check out." 
    });
  }, [toast]);

  // Header search submit: the header has no seat over the catalog — scroll
  // down to the rack so the query's effect is visible (same as the hero).
  const scrollToCatalog = useCallback(() => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Error boundary fallback component
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          regions={regions}
          onNavigate={(v) => (v === "shop" ? goShop() : goTrack())}
          onOpenCart={() => setCartOpen(true)}
          query={query}
          onQuery={setQuery}
          onSearchSubmit={scrollToCatalog}
        />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-4">{typeof error === 'string' ? error : 'An error occurred'}</p>
            <button 
              onClick={retry}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer
          onNavigate={(v, q) => (v === "shop" ? goShopQuery(q) : goTrack())}
        />
      </div>
    );
  }

  return (
    <div className="ms-root min-h-screen flex flex-col">
      <Header
        regions={regions}
        onNavigate={(v) => (v === "shop" ? goShop() : goTrack())}
        onOpenCart={() => setCartOpen(true)}
        query={query}
        onQuery={setQuery}
        onSearchSubmit={scrollToCatalog}
      />

      <ErrorBoundary>
        <main className="flex-1 flex flex-col">
          {/* keyed by view — remounts replay the soft fade-rise on every switch */}
          <div key={view} className="ms-view-in flex-1 flex flex-col">
            {view === "shop" && (
              <>
                <Hero
                  onShop={() => {
                    const catalogElement = document.getElementById("catalog");
                    if (catalogElement) {
                      catalogElement.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  onTrack={goTrack}
                />
                <ProductGrid
                  products={products}
                  regions={regions}
                  region={region}
                  onSelect={setSelected}
                  loading={loading}
                  error={error}
                  onRetry={retry}
                  query={query}
                  onClearQuery={() => setQuery("")}
                />
                {/* trust strip — the shop counter (Task 59): three steel service
                  plaques bolted between the rack and the back wall. Same face
                  paint as the cabinets (shared tokens), the cabinet drawers'
                  dark-framed label card as the title, a milled die with the
                  stamped mark, an orange ink index stamp, and the rack's
                  cursor sheen crossing the face on hover. */}
                <section className="border-t border-line bg-mist py-10 md:py-12" aria-label="Trade assurances">
                  <Reveal className="grid gap-6 sm:grid-cols-3">
                    {[
                      {
                        index: "01",
                        title: "EAC DUTY-FREE MOVEMENT",
                        // Fact-checked (Tasks 60/61): intra-EAC zero-duty comes from
                        // the Customs Union free trade area + EAC Rules of Origin —
                        // never the CET, which governs goods entering the bloc from
                        // outside. DR Congo is an EAC member on a transitional
                        // customs-integration roadmap, so its corridor carries an
                        // estimated duty quoted transparently at checkout.
                        body: "Goods originating in Uganda clear duty-free into Kenya, Tanzania and Rwanda under the EAC Customs Union free trade area — certified against the EAC Rules of Origin. DR Congo moves on a transitional corridor as its customs integration completes — duty, certificates and levies quoted upfront.",
                        icon: (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3z" />
                            <path d="M9 11.6l2.1 2.1L15.5 9" />
                          </svg>
                        ),
                      },
                      {
                        index: "02",
                        title: "END-TO-END FULFILLMENT",
                        body: "Every order flows into our warehouse system — stock decrements, picking, driver runsheets and cash-on-delivery reconciliation follow automatically.",
                        icon: (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2.5 6.5h11v9h-11z" />
                            <path d="M13.5 9.5h4l3 3.2v2.8h-7" />
                            <circle cx="6.5" cy="17.8" r="1.7" />
                            <circle cx="16.8" cy="17.8" r="1.7" />
                          </svg>
                        ),
                      },
                      {
                        index: "03",
                        title: "TRANSPARENT CROSS-BORDER PRICING",
                        body: "Duties, VAT and freight are estimated per destination before payment — no surprise fees at the border.",
                        icon: (
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2H2v10l9.3 9.3a1.4 1.4 0 0 0 2 0l8-8a1.4 1.4 0 0 0 0-2L12 2z" />
                            <circle cx="7.2" cy="7.2" r="1.5" />
                          </svg>
                        ),
                      },
                    ].map((p, i) => (
                      <div key={p.index} className="ms-plaque flex flex-col p-5">
                        <div className="mb-4 flex items-start justify-between">
                          <span className="ms-plaque-die" aria-hidden="true">{p.icon}</span>
                          <span className="ms-plaque-index" aria-hidden="true">{p.index}</span>
                        </div>
                        <p className="ms-file-label">{p.title}</p>
                        <p className="ms-plaque-body">{p.body}</p>
                        <span className="ms-spot" aria-hidden="true" />
                      </div>
                    ))}
                  </Reveal>
                  
                  {/* Reviews — the reserved shelf. The store hasn't made its
                    first delivery yet, so there is nothing to publish and
                    the section says so plainly (owner decision, round 5:
                    no invented quotes, no fake stars). REVIEWS is the
                    drop-in point — real entries render as plaques. */}
                  <div className="mt-16 px-4">
                    <div className="mx-auto max-w-4xl">
                      <h2 className="ms-display mb-10 text-center text-2xl">
                        WHAT OUR CUSTOMERS SAY
                      </h2>
                      {REVIEWS.length === 0 ? (
                        <div className="ms-plaque p-8 text-center">
                          <p className="ms-display text-lg text-ink md:text-xl">
                            NOTHING PUBLISHED YET
                          </p>
                          <p className="mx-auto mt-3 max-w-md text-[13px] leading-[21px] text-hush">
                            This store is new and the first deliveries haven&apos;t
                            landed. Every customer review will publish here
                            unedited — good or bad. That&apos;s the standard.
                          </p>
                          <span className="ms-spot" aria-hidden="true" />
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                          {REVIEWS.map((r) => (
                            <figure key={r.author} className="ms-plaque p-6">
                              <blockquote className="text-[13px] leading-[21px] text-ink">
                                &ldquo;{r.quote}&rdquo;
                              </blockquote>
                              <figcaption className="mt-4">
                                <p className="ms-label text-ink">{r.author}</p>
                                <p className="ms-label text-hush">{r.company}</p>
                              </figcaption>
                              <span className="ms-spot" aria-hidden="true" />
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {view === "checkout" && (
              <Checkout
                regions={regions}
                onPlaced={(o) => {
                  setPlaced(o);
                  setView("confirmation");
                  scrollToTop();
                }}
                onBack={goShop}
              />
            )}

            {view === "confirmation" && placed && (
              <Confirmation
                order={placed}
                regions={regions}
                onContinue={goShop}
                onTrack={goTrack}
              />
            )}

            {view === "track" && <TrackOrder />}
          </div>
        </main>
      </ErrorBoundary>

      <Footer
        onNavigate={(v, q) => (v === "shop" ? goShopQuery(q) : goTrack())}
      />

      {/* fly-to-cart dot — page-level so it can reach the header badge */}
      <FlyDot />

      {/* overlays — keyed by product so variant/qty state resets each open */}
      <QuickView
        key={selected?.productId || "none"}
        product={selected}
        regions={regions}
        onClose={() => setSelected(null)}
        onAdded={handleAdded}
      />
      <CartDrawer
        open={cartOpen}
        regions={regions}
        region={region}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          if (cartLines.length === 0) return;
          setCartOpen(false);
          setView("checkout");
          scrollToTop();
        }}
      />
    </div>
  );
}
