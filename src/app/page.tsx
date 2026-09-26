"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart, useRegion } from "@/lib/store";
import { useCatalog } from "@/hooks/use-catalog";
import Header from "@/components/storefront/header";
import Hero from "@/components/storefront/hero";
import ProductGrid from "@/components/storefront/product-grid";
import QuickView from "@/components/storefront/quick-view";
import CartDrawer from "@/components/storefront/cart-drawer";
import Checkout from "@/components/storefront/checkout";
import Confirmation from "@/components/storefront/confirmation";
import TrackOrder from "@/components/storefront/track-order";
import Reveal from "@/components/storefront/reveal";
import FlyDot from "@/components/storefront/fly-dot";
import Footer from "@/components/storefront/footer";
import type { PlacedOrder, Product } from "@/lib/types";

type View = "shop" | "checkout" | "confirmation" | "track";

export default function Storefront() {
  const { products, regions, loading } = useCatalog();
  const cartLines = useCart((s) => s.lines);
  const region = useRegion((s) => s.region);
  const { toast } = useToast();

  // Mark both persisted stores as hydrated after React hydration completes.
  // zustand v5's persist never fires onRehydrateStorage's callback here, so
  // the hasHydrated flag could stay false forever and pin every price to the
  // $ fallback. Flipping post-hydration means no SSR mismatch, and it
  // self-heals hasHydrated:false values persisted by older builds.
  useEffect(() => {
    useCart.setState({ hasHydrated: true });
    useRegion.setState({ hasHydrated: true });
  }, []);

  const [view, setView] = useState<View>("shop");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [query, setQuery] = useState("");

  function goShop() {
    setView("shop");
    window.scrollTo({ top: 0 });
  }
  function goTrack() {
    setView("track");
    window.scrollTo({ top: 0 });
  }

  function handleAdded() {
    toast({ title: "ADDED TO CART", description: "Open the cart to check out." });
  }

  return (
    <div className="ms-root min-h-screen flex flex-col">
      <Header
        regions={regions}
        onNavigate={(v) => (v === "shop" ? goShop() : goTrack())}
        onOpenCart={() => setCartOpen(true)}
        query={query}
        onQuery={setQuery}
      />

      <main className="flex-1 flex flex-col">
        {/* keyed by view — remounts replay the soft fade-rise on every switch */}
        <div key={view} className="ms-view-in flex-1 flex flex-col">
        {view === "shop" && (
          <>
            <Hero
              onShop={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
              query={query}
              onQuery={setQuery}
            />
            <ProductGrid
              products={products}
              regions={regions}
              region={region}
              onSelect={setSelected}
              loading={loading}
              query={query}
              onClearQuery={() => setQuery("")}
            />
            {/* trust strip — the shop counter (Task 59): three steel service
                plaques bolted between the rack and the back wall. Same face
                paint as the cabinets (shared tokens), the cabinet drawers'
                dark-framed label card as the title, a milled die with the
                stamped mark, an orange ink index stamp, and the rack's
                cursor sheen crossing the face on hover. */}
            <section className="border-t border-line bg-mist px-4 md:px-8 py-10 md:py-12" aria-label="Trade assurances">
              <Reveal className="grid gap-6 sm:grid-cols-3">
                {[
                  {
                    index: "01",
                    title: "EAC DUTY-FREE MOVEMENT",
                    // Fact-checked (Task 60): intra-EAC zero-duty comes from
                    // the Customs Union free trade area + EAC Rules of Origin.
                    // The Common External Tariff only governs goods entering
                    // the bloc from outside — never intra-EAC trade.
                    body: "Goods originating in Uganda clear duty-free into Kenya, Tanzania and Rwanda under the EAC Customs Union free trade area — certified against the EAC Rules of Origin. The Common External Tariff applies only to goods entering the bloc from outside.",
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
            </section>
          </>
        )}

        {view === "checkout" && (
          <Checkout
            regions={regions}
            onPlaced={(o) => {
              setPlaced(o);
              setView("confirmation");
              window.scrollTo({ top: 0 });
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

      <Footer onNavigate={(v) => (v === "shop" ? goShop() : goTrack())} />

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
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
