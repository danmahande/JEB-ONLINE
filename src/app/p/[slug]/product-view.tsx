"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import FlyDot from "@/components/storefront/fly-dot";
import { useCart, useFly, useRegion } from "@/lib/store";
import { fmt } from "@/lib/format";
import { leviesFor } from "@/lib/levies";
import { useToast } from "@/hooks/use-toast";
import type { Product, RegionConfig } from "@/lib/types";

/* A product's own address — /p/[slug]. Same steel as the rack: the tile
   becomes a full sheet, the image pane keeps its glass and sticker stack,
   and the details column reuses the quick-view's controls milled one size
   larger. The page is reachable from the quick-view's "FULL PRODUCT PAGE"
   link, from the sitemap, and straight from a shared URL. */
export default function ProductView({
  product,
  regions,
}: {
  product: Product;
  regions: RegionConfig[];
}) {
  const router = useRouter();
  const addLine = useCart((s) => s.addLine);
  const flyTo = useFly((s) => s.flyTo);
  const region = useRegion((s) => s.region);
  const regionHasHydrated = useRegion((s) => s.hasHydrated);
  const { toast } = useToast();

  // same hydration contract as the home view (src/app/page.tsx): zustand v5
  // persist never fires the rehydrate callback here, so flip post-hydration
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");

  // open on the BASE pack (closest to 0 delta) — the one the catalog advertises
  const [variantIdx, setVariantIdx] = useState(() => {
    let best = 0;
    let bestAbs = Infinity;
    product.variants.forEach((pv, i) => {
      const a = Math.abs(pv.priceDelta);
      if (a < bestAbs) {
        bestAbs = a;
        best = i;
      }
    });
    return best;
  });
  const [qty, setQty] = useState(1);

  // restock alert — same endpoint the sold-out tiles post to
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const v = useMemo(() => product.variants[variantIdx], [product.variants, variantIdx]);
  const active = regions.find((r) => r.region === region);
  const displayRegion = active || regions[0]; // Use first region as fallback
  const priceUsd = product.unitSellingPrice + (v?.priceDelta || 0);
  const out = product.currentStock <= 0;
  const totalFmt = (usd: number) =>
    displayRegion && regionHasHydrated ? fmt(usd, displayRegion) : `$${usd.toFixed(2)}`;

  function handleAdd() {
    if (out || !v) return;
    addLine({
      productId: product.productId,
      slug: product.slug,
      productLabel: product.productLabel,
      brand: product.brand,
      variantLabel: v.label,
      unitPriceUsd: priceUsd,
      weightKg: v.weightKg,
      qty,
      image: product.image,
      maxStock: product.currentStock,
    });
    // fly from the ADD button — the header badge pop is the payoff
    const el = document.getElementById("pdp-add");
    if (el) {
      const r = el.getBoundingClientRect();
      flyTo(r.left + r.width / 2, r.top + r.height / 2);
    }
    toast({
      title: "ADDED TO CART",
      description: `${product.productLabel} · ${v.label} × ${qty}`,
    });
  }

  async function handleNotify(e: FormEvent) {
    e.preventDefault();
    setNotifyError(null);
    setNotifyBusy(true);
    try {
      const res = await fetch("/api/restock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.productId, email: notifyEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save the alert");
      setNotifyDone(true);
      toast({
        title: data.already ? "ALREADY ON THE LIST" : "WE'LL NOTIFY YOU",
        description: `${product.productLabel} — restock alert set for ${notifyEmail.trim()}.`,
      });
      setNotifyEmail("");
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : "Could not save the alert");
    } finally {
      setNotifyBusy(false);
    }
  }

  const nav = (view: "shop" | "track") =>
    router.push(view === "shop" ? "/?view=shop" : "/?view=track");

  return (
    <div className="ms-root min-h-screen flex flex-col">
      <Header
        regions={regions}
        onNavigate={nav}
        onOpenCart={() => setCartOpen(true)}
        query={query}
        onQuery={setQuery}
        onSearchSubmit={() => {
          if (query.trim()) router.push(`/?q=${encodeURIComponent(query.trim())}`);
        }}
      />

      <main className="flex-1 flex flex-col">
        <div className="ms-view-in flex-1 flex flex-col">
          <section className="bg-mist py-10 md:py-14" aria-label={product.productLabel}>
            {/* toolbar module — same control rail as the catalog/checkout */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-0 rounded-t-lg border border-b-0 border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
              <Link
                href="/?view=shop"
                className="ms-label hover:text-brand transition-colors"
              >
                ← CATALOG
              </Link>
              <p className="ms-label text-hush truncate">
                {product.category} / {product.brand || product.merchantName}
              </p>
            </div>

            {/* the sheet — one product on the shopfront frame */}
            <div className="ms-shopfront">
              <div className="grid md:grid-cols-2 border-x border-b border-line bg-white overflow-hidden">
                {/* image pane — glass, sticker stack, same as the rack tiles */}
                <div className="relative aspect-square bg-muted border-b md:border-b-0 md:border-r border-line">
                  <Image
                    src={product.image || "/products/placeholder.png"}
                    alt={product.productLabel}
                    fill
                    priority
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <span className="ms-glass" aria-hidden="true" />
                  <div className="ms-sticker-stack absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
                    <span className="ms-label ms-sticker bg-white px-2 py-1 text-ink">
                      {product.category}
                    </span>
                    {active?.isEac && active.dutyRate === 0 && (
                      <span className="ms-label ms-sticker bg-emerald-500 text-white px-2 py-1">
                        0% DUTY
                      </span>
                    )}
                  </div>
                  <span className="ms-label absolute bottom-3 left-3 bg-white border border-line px-2 py-1 text-ink">
                    HS {product.hsCode} · ORIGIN {product.originCountry}
                  </span>
                </div>

                {/* details column */}
                <div className="p-5 md:p-8 flex flex-col">
                  <p className="ms-label text-hush mb-2">
                    {product.brand} · {product.unitSellingPrice > 0 ? product.merchantName : ""}
                  </p>
                  <h1 className="ms-display text-3xl md:text-4xl mb-4 normal-case tracking-tight">
                    {product.productLabel}
                  </h1>

                  {product.description && (
                    <p className="text-sm leading-relaxed mb-6 opacity-80">
                      {product.description}
                    </p>
                  )}

                  {/* pack rail — the same selector slot as the rack */}
                  {product.variants.length > 1 && (
                    <div className="mb-5">
                      <p className="ms-label mb-2 text-hush">SELECT PACK</p>
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={`Pack options for ${product.productLabel}`}
                      >
                        {product.variants.map((pv, i) => (
                          <button
                            key={pv.label}
                            onClick={() => setVariantIdx(i)}
                            aria-pressed={i === variantIdx}
                            className={`ms-weight-toggle ${i === variantIdx ? "is-on" : ""}`}
                          >
                            {pv.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* price + stock */}
                  <div className="flex items-baseline justify-between border-t border-line pt-4 mt-auto">
                    <div>
                      <p className="ms-label text-hush mb-1">UNIT PRICE</p>
                      <p
                        key={region}
                        className="ms-price ms-price-flash text-2xl md:text-3xl tracking-tight text-brand"
                      >
                        {totalFmt(priceUsd)}
                      </p>
                    </div>
                    <p className={`ms-label text-right ${out ? "text-red-500" : ""}`}>
                      {out ? (
                        "SOLD OUT"
                      ) : (
                        <>
                          {product.currentStock} {product.unit}
                          {product.currentStock === 1 ? "" : "S"} IN STOCK
                        </>
                      )}
                    </p>
                  </div>

                  {/* qty + add / restock alert */}
                  {out ? (
                    <div className="mt-5">
                      {notifyDone ? (
                        <p className="ms-label text-emerald-600 flex items-center gap-2">
                          <span aria-hidden="true">✓</span> ON THE LIST — WE&apos;LL EMAIL WHEN
                          IT'S BACK
                        </p>
                      ) : (
                        <form onSubmit={handleNotify} className="flex flex-col gap-1.5">
                          <p className="ms-label mb-1 text-hush">
                            NOTIFY ME WHEN IT&apos;S BACK IN STOCK
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              type="email"
                              required
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              placeholder="you@company.com"
                              aria-label={`Email for ${product.productLabel} restock alert`}
                              aria-invalid={notifyError ? true : undefined}
                              className="ms-field flex-1 min-w-0"
                            />
                            <button
                              type="submit"
                              disabled={notifyBusy}
                              className="ms-label ms-key ms-key-ink px-4 shrink-0 disabled:opacity-40"
                            >
                              {notifyBusy ? "…" : "→"}
                            </button>
                          </div>
                          {notifyError && (
                            <p className="text-[12px] text-red-500" role="alert">
                              {notifyError}
                            </p>
                          )}
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-5 items-end">
                      <div role="group" aria-label="Quantity">
                        <p className="ms-label mb-2 text-hush">QUANTITY</p>
                        <div className="flex border border-line">
                          <button
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            className="ms-label px-4 py-2 hover:bg-ink hover:text-white transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span
                            className="ms-label px-4 py-3 border-x border-line min-w-[3.5rem] text-center"
                            aria-live="polite"
                          >
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty((q) => Math.min(product.currentStock, q + 1))}
                            className="ms-label px-4 py-2 hover:bg-ink hover:text-white transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        id="pdp-add"
                        onClick={handleAdd}
                        className="ms-label ms-key flex-1 px-6 py-4"
                      >
                        {qty > 1 ? `ADD ${qty} TO CART` : "ADD TO CART"}
                      </button>
                    </div>
                  )}

                  {/* corridor note — the same copy the quick-view quotes */}
                  <p className="ms-label mt-4 text-hush">
                    {active?.isEac && active.dutyRate === 0
                      ? leviesFor(active.region).length > 0
                        ? `EAC ORIGIN — NO IMPORT DUTY. BORDER LEVIES & VAT APPLY AT CHECKOUT.`
                        : `EAC ORIGIN — NO IMPORT DUTY. VAT APPLIES AT CHECKOUT.`
                      : active?.isEac
                        ? `EAC CORRIDOR — TRANSITIONAL DUTY, LEVIES & VAT ESTIMATED AT CHECKOUT.`
                        : `INTERNATIONAL ORDERS — DUTY ESTIMATED AT CHECKOUT.`}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer onNavigate={nav} />

      {/* fly-to-cart dot — page-level so it can reach the header badge */}
      <FlyDot />

      <CartDrawer
        open={cartOpen}
        regions={regions}
        region={region}
        onOpenChange={setCartOpen}
        onCheckout={() => {
          if (useCart.getState().lines.length === 0) return;
          setCartOpen(false);
          router.push("/?view=checkout");
        }}
      />
    </div>
  );
}
