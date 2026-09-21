"use client";

import { useState } from "react";
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
import Footer from "@/components/storefront/footer";
import type { PlacedOrder, Product } from "@/lib/types";

type View = "shop" | "checkout" | "confirmation" | "track";

export default function Storefront() {
  const { products, regions, loading } = useCatalog();
  const cartLines = useCart((s) => s.lines);
  const region = useRegion((s) => s.region);
  const { toast } = useToast();

  const [view, setView] = useState<View>("shop");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

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
        {view === "shop" && (
          <>
            <Hero onShop={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })} />
            <ProductGrid
              products={products}
              regions={regions}
              region={region}
              onSelect={setSelected}
              loading={loading}
            />
            {/* trust strip */}
            <section className="border-t border-line bg-white px-4 md:px-8 py-10 grid sm:grid-cols-3 gap-6" aria-label="Trade assurances">
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
      </main>

      <Footer onNavigate={(v) => (v === "shop" ? goShop() : goTrack())} />

      {/* overlays */}
      <QuickView
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
