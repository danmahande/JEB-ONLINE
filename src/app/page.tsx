"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart, useRegion, useSky } from "@/lib/store";
import { useCatalog } from "@/hooks/use-catalog";
import { useDaypartTicker } from "@/lib/use-daypart";
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
  const natural = useSky((s) => s.natural);
  const skyOverride = useSky((s) => s.override);
  const sky = skyOverride ?? natural;
  const { toast } = useToast();

  // drives the living sky — recomputes the day-part every minute
  useDaypartTicker();

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
            {/* trust strip */}
            <section className="border-t border-line bg-white px-4 md:px-8 py-10" aria-label="Trade assurances">
              <Reveal className="grid sm:grid-cols-3 gap-6">
                {[
                  ["EAC PREFERENTIAL TARIFFS", "Goods originating in Uganda move duty-free across Kenya, Tanzania and Rwanda under the EAC Common External Tariff."],
                  ["END-TO-END FULFILLMENT", "Every order flows into our warehouse system — stock decrements, picking, driver runsheets and cash-on-delivery reconciliation follow automatically."],
                  ["TRANSPARENT CROSS-BORDER PRICING", "Duties, VAT and freight are estimated per destination before payment — no surprise fees at the border."],
                ].map(([title, body]) => (
                  <div key={title}>
                    <p className="ms-label mb-2 border-l-2 border-brand pl-3">{title}</p>
                    <p className="text-sm leading-relaxed text-hush">{body}</p>
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

      {/* page-wide sunlight — the day-part wash flows over everything as you
          scroll (catalog, trust strip, footer, chrome), not just the hero.
          z-45: above the sticky header so the whole page warms together,
          below dialogs/sheets (z-50) so commerce stays crisp. Same useSky
          state as the hero, so the footer sky override drives it too. */}
      <div className="ms-sun" aria-hidden="true">
        <div className={`ms-sky ms-sun-dawn ${sky === "dawn" ? "ms-sky-on" : ""}`} />
        <div className={`ms-sky ms-sun-golden ${sky === "golden" ? "ms-sky-on" : ""}`} />
        <div className={`ms-sky ms-sun-night ${sky === "night" ? "ms-sky-on" : ""}`} />
      </div>

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
