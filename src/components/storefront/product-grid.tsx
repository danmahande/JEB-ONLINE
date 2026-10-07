"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Product, RegionConfig } from "@/lib/types";
import { fmt } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useRegion } from "@/lib/store";
import { HousePlate } from "@/components/storefront/house-plates";

const TABS = [
  { key: "ALL", label: "ALL" },
  { key: "GRAINS", label: "GRAINS" },
  { key: "HARDWARE", label: "HARDWARE" },
];

/* Live column count of the catalog grid — mirrors the Tailwind breakpoints
   used on the grid element below (2 / md:3 / lg:4 / xl:5 / 2xl:6; Tailwind
   default screens, no custom override in tailwind.config). Starts at 0 so
   SSR and the first client render agree (no plates -> no hydration miss),
   then fills in on mount. */
function useGridColumns() {
  const [cols, setCols] = useState(0);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setCols(w >= 1536 ? 6 : w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 768 ? 3 : 2);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return cols;
}

// Enhanced skeleton loader component for better loading UX
function ProductSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="ms-tile group relative flex flex-col border border-line animate-pulse"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="ms-base" aria-hidden="true" />
      <div className="relative aspect-square bg-muted/50" />
      <div className="flex flex-col gap-1.5 flex-1 p-3">
        <div className="h-3 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-muted rounded w-4/5 mb-2"></div>
        <div className="h-3 bg-muted rounded w-2/3 mb-3"></div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <div className="h-5 w-12 bg-muted rounded-sm"></div>
          <div className="h-5 w-12 bg-muted rounded-sm"></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 mt-auto">
          <div className="h-6 bg-muted rounded w-16"></div>
          <div className="h-8 w-16 bg-muted rounded-md"></div>
        </div>
      </div>
      <div className="ms-spot" aria-hidden="true" />
    </div>
  );
}

export default function ProductGrid({
  products,
  regions,
  region,
  onSelect,
  loading,
  error,
  onRetry,
  query,
  onClearQuery,
}: {
  products: Product[];
  regions: RegionConfig[];
  region: string;
  onSelect: (p: Product) => void;
  loading: boolean;
  /** catalog feed failure — renders the warehouse-unreachable state, never
      the "no products match" search-empty panel */
  error?: string | null;
  onRetry?: () => void;
  query: string;
  onClearQuery: () => void;
}) {
  const [tab, setTab] = useState("ALL");
  const [picked, setPicked] = useState<Record<string, number>>({}); // productId -> variant index
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyDone, setNotifyDone] = useState<Set<string>>(new Set());
  // product currently POSTing its restock alert + the last inline failure,
  // so a rejected signup stays open with the reason instead of silently dying
  const [notifyBusy, setNotifyBusy] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const { toast } = useToast();
  const active = regions.find((r) => r.region === region);
  const regionHasHydrated = useRegion((s) => s.hasHydrated);
  const gridCols = useGridColumns();

  const q = query.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (tab !== "ALL" && p.category !== tab) return false;
    if (!q) return true;
    return (
      p.productLabel.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  // index of the base/default variant (closest to 0 delta), not the smallest pack
  function baseVariantIndex(p: Product) {
    let best = 0;
    p.variants.forEach((v, i) => {
      if (Math.abs(v.priceDelta) < Math.abs(p.variants[best].priceDelta)) best = i;
    });
    return best;
  }

  /* Tile chips carry the measure only ("25KG", "2M", "16OZ") — the pack
     word stays on the full label (chip title + quick-view sheet), so
     every rail reads as one uniform bank of spec stamps (Task 55). */
  const PACK_WORD = /\s+(BAG|PACK|CARTON|SHEET|TRAY|BOX|ROLL)\s*$/i;
  function chipLabel(label?: string | null) {
    const s = (label ?? "").trim();
    return s.replace(PACK_WORD, "") || s;
  }

  /* House plates fill the tail of the last row so the rack never shows a
     hole. Skipped while a search is active — results should stay sparse and
     literal — and while gridCols is still 0 (pre-mount). */
  const housePlates =
    !q && gridCols > 0 && filtered.length > 0
      ? (gridCols - (filtered.length % gridCols)) % gridCols
      : 0;
  const plateDelay = Math.min(filtered.length * 40, 240) + 80;

  return (
    <section
      id="catalog"
      className="bg-mist py-10 md:py-14"
      aria-label="Catalog"
    >
      {/* fascia board — the toolbar mounts flush on the shopfront frame below */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-t-lg border border-b-0 border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
        <div className="min-w-0">
          {/* the rack counter — replays the greeting swap whenever the count moves */}
          <p key={loading ? "loading" : error ? "error" : `${tab}|${q}|${filtered.length}`} className="ms-label ms-fade-swap mb-1.5 text-hush">
            {loading
              ? "LIVE STOCK"
              : error
                ? "RACK OFFLINE"
                : `${filtered.length} ${filtered.length === 1 ? "ITEM" : "ITEMS"} IN VIEW`}
          </p>
          <h2 className="ms-display text-2xl md:text-3xl leading-none tracking-[-0.04em]">
            CATALOG
            <span className="ml-1.5 inline-block h-2.5 w-2.5 bg-brand align-middle" aria-hidden="true" />
          </h2>
        </div>
        <div className="flex overflow-hidden rounded-[4px] border border-line" role="tablist" aria-label="Category filter">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="ms-tab"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* search status strip — continues the fascia down to the frame */}
      {q && (
        <div className="flex flex-wrap items-center gap-3 border-x border-line bg-white px-4 py-2.5">
          <p className="text-sm text-hush">
            Showing <span className="font-bold text-ink">{filtered.length}</span> result
            {filtered.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
          </p>
          <button
            onClick={onClearQuery}
            className="ms-label border border-line bg-white px-3 py-1.5 hover:bg-ink hover:text-white transition-colors"
          >
            CLEAR ✕
          </button>
        </div>
      )}

      {/* the shopfront frame — panes are the tiles, the grid gaps show the
          frame steel through as mullions (Task 38) */}
      <div className="ms-shopfront">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 md:gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductSkeleton key={i} index={i} />
          ))}
        </div>
      ) : error ? (
        /* server feed failed — a distinct alarm, worlds apart from an
           empty search result */
        <div className="rounded-lg border border-line bg-white px-6 py-16 text-center">
          <p className="ms-display text-2xl md:text-3xl tracking-tight mb-3">
            CAN&apos;T REACH THE WAREHOUSE
            <span className="ml-2 inline-block h-2 w-2 bg-red-500 align-middle" aria-hidden="true" />
          </p>
          <p className="text-sm text-hush mb-2">
            The catalog feed failed to load{error ? ` — ${error}` : ""}.
          </p>
          <p className="text-sm text-hush mb-6">
            Nothing on the rack is lost — check the connection and pull the
            feed again.
          </p>
          <button onClick={onRetry} className="ms-label ms-key px-6 py-3">
            RETRY THE FEED
          </button>
        </div>
      ) : products.length === 0 ? (
        /* the catalog is genuinely empty — the owner has not stocked the
           store yet. Worlds apart from a failed feed (RACK OFFLINE above)
           and from a search miss (below): nothing is broken, the shelves
           are waiting for their first receipts. */
        <div className="rounded-lg border border-line bg-white px-6 py-16 text-center">
          <p className="ms-display text-2xl md:text-3xl tracking-tight mb-3">
            THE RACK IS BEING STOCKED
            <span className="ml-2 inline-block h-2 w-2 bg-brand align-middle" aria-hidden="true" />
          </p>
          <p className="mx-auto mb-6 max-w-md text-sm text-hush">
            No products are published yet — the warehouse team loads the
            catalog from the operations dashboard. Check back shortly.
          </p>
        </div>
      ) : filtered.length === 0 && q ? (
        <div className="rounded-lg border border-line bg-white px-6 py-16 text-center">
          <p className="font-bold text-lg mb-2">No products match &ldquo;{query.trim()}&rdquo;.</p>
          <p className="text-sm text-hush mb-6">
            Try &ldquo;maize&rdquo;, &ldquo;cement&rdquo; or &ldquo;nails&rdquo; — or browse the full catalog.
          </p>
          <button
            onClick={onClearQuery}
            className="ms-label ms-key px-6 py-3"
          >
            SHOW EVERYTHING
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* a category rack with nothing on it — not a search miss, so the
           fix is switching racks, not clearing a query */
        <div className="rounded-lg border border-line bg-white px-6 py-16 text-center">
          <p className="font-bold text-lg mb-2">Nothing in {tab} yet.</p>
          <p className="text-sm text-hush mb-6">
            The other shelves have stock — browse the full catalog.
          </p>
          <button
            onClick={() => setTab("ALL")}
            className="ms-label ms-key px-6 py-3"
          >
            SHOW EVERYTHING
          </button>
        </div>
      ) : (
        <div
          key={`${tab}|${q}`}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 md:gap-3"
        >
          {filtered.map((p, i) => {
            const variants = p.variants;
            const idx = picked[p.productId] ?? baseVariantIndex(p);
            const v = variants[idx];
            const priceUsd = p.unitSellingPrice + (v?.priceDelta || 0);
            const out = p.currentStock <= 0;
            const low = !out && p.currentStock <= 50;
            // Alibaba-gauge price splits into a small raised currency mark
            // and a 20px bold amount ("USh 112,992" -> "USh" + "112,992")
            // — all content sizes are px-exact so the app-wide 85% html dial
            // can't shrink them off Alibaba's rendered gauges (Task 57)
            const priceStr = active && regionHasHydrated ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`;
            const priceSplit = /^([^\d]+)\s*(.+)$/.exec(priceStr);
            return (
              <div
                key={p.productId}
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                onMouseMove={(e) => {
                  // cabinet sheen + approach parallax — cursor tracked via CSS
                  // vars, no re-render; --nx/--ny (0..1) drive the goods
                  // drifting behind the glass, --mx/--my drive the spotlight
                  const el = e.currentTarget;
                  const r = el.getBoundingClientRect();
                  const x = e.clientX - r.left;
                  const y = e.clientY - r.top;
                  el.style.setProperty("--mx", `${x}px`);
                  el.style.setProperty("--my", `${y}px`);
                  el.style.setProperty("--nx", (x / r.width).toFixed(4));
                  el.style.setProperty("--ny", (y / r.height).toFixed(4));
                }}
                onClick={() => onSelect(p)}
                className={`ms-tile ms-tile-in group relative flex flex-col border border-line cursor-pointer ${
                  out ? "ms-oos" : ""
                }`}
              >
                {/* the slab's base — extruded steel thickness hanging
                    under the face (Task 43); painted behind the face,
                    pointer-events none so the grid gaps stay click-dead */}
                <span className="ms-base" aria-hidden="true" />
                {/* the whole tile is the hit target — inner controls below stop
                    propagation so they don't also open the quick-view sheet */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(p);
                  }}
                  className="relative block w-full text-left"
                  aria-label={`View ${p.productLabel} details — ${priceStr}, ${p.currentStock} ${p.unit} in stock`}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {/* through the optimizer — AVIF/WebP + responsive srcset
                        off the same /products files; fill matches the pane,
                        sizes mirrors the grid's 2/3/4/5/6 column rhythm */}
                    <Image
                      src={p.image || "/products/placeholder.png"}
                      alt={p.productLabel}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="w-full h-full object-cover"
                    />
                    {/* the pane — goods displayed behind glass; the rake delay
                        follows the crane-drop stagger so light lands after the
                        tiles do */}
                    <span
                      className="ms-glass"
                      style={{ animationDelay: `${Math.min(i * 40, 240) + 350}ms` }}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* badges — die-cut stickers stuck on the outside of the
                    glass (Task 39); pointer-events-none so the whole tile
                    stays the hit target */}
                <div className="ms-sticker-stack absolute top-2 left-2 flex flex-col items-start gap-1.5 pointer-events-none">
                  <span className="ms-label ms-sticker bg-white px-2 py-1 text-ink">
                    {p.category}
                  </span>
                  {/* duty-free claim only where the quote engine actually
                      charges 0% — the DRC corridor is transitional (Task 61) */}
                  {active?.isEac && active.dutyRate === 0 && (
                    <span className="ms-label ms-sticker bg-emerald-500 text-white px-2 py-1">
                      0% DUTY
                    </span>
                  )}
                  {p.category === "GRAINS" && !out && (
                    <span className="ms-label ms-sticker inline-flex items-center gap-1.5 bg-white/90 text-emerald-700 px-2 py-1">
                      <span className="ms-fresh-dot" aria-hidden="true" />
                      HARVESTED THIS WEEK
                    </span>
                  )}
                </div>
                {out && (
                  <span className="ms-label ms-sticker ms-sticker-alt absolute top-2 right-2 bg-red-500 text-white px-2 py-1">
                    SOLD OUT
                  </span>
                )}

                {/* info panel */}
                <div className="flex flex-col gap-1.5 flex-1 p-3">
                  <p className="ms-label ms-file-label truncate" title={p.brand ?? undefined}>{p.brand}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(p);
                    }}
                    className="text-left text-[16px] leading-[22px] font-semibold tracking-[-0.01em] line-clamp-2 min-h-[44px] hover:text-brand transition-colors"
                    title={p.productLabel}
                  >
                    {p.productLabel}
                  </button>
                  <p
                    className={`text-[12px] font-normal ${
                      out ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600"
                    }`}
                  >
                    {out
                      ? "Sold out — more arriving soon"
                      : low
                        ? `Only ${p.currentStock} left in stock`
                        : `In stock — ${p.currentStock} ${p.unit.toLowerCase()}${p.currentStock === 1 ? "" : "s"}`}
                  </p>
                  {/* pack rail — the same selector slot milled into every
                      slab: chips for multi-pack lines, one engraved spec
                      stamp for single-pack lines (Task 55) */}
                  <div
                    className="ms-pack-rail"
                    role={variants.length > 1 ? "group" : undefined}
                    aria-label={variants.length > 1 ? `Pack options for ${p.productLabel}` : undefined}
                  >
                    {variants.length > 1 ? (
                      variants.map((vv, vi) => (
                        <button
                          key={vv.label}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicked((s) => ({ ...s, [p.productId]: vi }));
                          }}
                          aria-pressed={vi === idx}
                          title={vv.label}
                          className={`ms-chip ${vi === idx ? "is-on" : ""}`}
                        >
                          {chipLabel(vv.label)}
                        </button>
                      ))
                    ) : (
                      <span className="ms-chip is-static" title={v?.label}>
                        {chipLabel(v?.label || p.weight || p.unit)}
                      </span>
                    )}
                  </div>
                  {/* price / action row — wraps below sm: mobile tiles are
                      ~128px of content width, too narrow for a 20px amount
                      plus a key, so the price takes its own line and the
                      action right-aligns under it (Alibaba's mobile card
                      pattern); sm+ stays one justify-between line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 mt-auto">
                    <div className="w-full min-w-0 sm:w-auto">
                      {/* Alibaba-gauge price: small raised currency mark +
                          20px bold amount, body Inter — Alibaba's own first
                          choice family; px-exact vs the 85% dial (Task 57) —
                          key={region} remounts on currency switch */}
                      <span
                        key={region}
                        className="ms-price-flash inline-flex items-start gap-0.5 whitespace-nowrap leading-none text-brand"
                      >
                        <span className="text-[12px] font-bold mt-0.5">{priceSplit?.[1]}</span>
                        <span className="text-[20px] font-bold tracking-tight">{priceSplit?.[2]}</span>
                      </span>
                    </div>
                    {out ? (
                      notifyDone.has(p.productId) ? (
                        <span className="ms-label text-emerald-600 shrink-0 ml-auto">✓ ON THE LIST</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifyOpen((o) => (o === p.productId ? null : p.productId));
                          }}
                          aria-expanded={notifyOpen === p.productId}
                          className={`ms-label ms-slip shrink-0 ml-auto px-3 py-2.5 border transition-colors ${
                            notifyOpen === p.productId
                              ? "ms-slip-open border-ink text-white"
                              : "border-line hover:bg-ink hover:text-white"
                          }`}
                        >
                          {notifyOpen === p.productId ? "✕" : "NOTIFY ME"}
                        </button>
                      )
                    ) : (
                      // one action per tile — ADD TO CART opens the
                      // quick-view sheet where pack + quantity are chosen
                      // (owner decision: no direct-add from the tile)
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p);
                        }}
                        className="ms-label ms-key px-3 py-2.5 shrink-0 ml-auto"
                        aria-label={`Add ${p.productLabel} to cart — choose pack and quantity`}
                      >
                        ADD TO CART
                      </button>
                    )}
                  </div>

                  {/* restock notify form — sold-out tiles only */}
                  {out && notifyOpen === p.productId && !notifyDone.has(p.productId) && (
                    <form
                      className="flex flex-col gap-1.5 mt-2"
                      onClick={(e) => e.stopPropagation()}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setNotifyError(null);
                        setNotifyBusy(p.productId);
                        try {
                          const res = await fetch("/api/restock-notify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ productId: p.productId, email: notifyEmail }),
                          });
                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            throw new Error(data.error || "Could not save the alert");
                          }
                          setNotifyDone((s) => new Set(s).add(p.productId));
                          setNotifyOpen(null);
                          toast({
                            title: data.already ? "ALREADY ON THE LIST" : "WE'LL NOTIFY YOU",
                            description: `${p.productLabel} — restock alert set for ${notifyEmail.trim()}.`,
                          });
                          setNotifyEmail("");
                        } catch (err) {
                          setNotifyError(
                            err instanceof Error ? err.message : "Could not save the alert"
                          );
                        } finally {
                          setNotifyBusy(null);
                        }
                      }}
                    >
                      <div className="flex gap-1.5">
                        <input
                          type="email"
                          required
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="you@company.com"
                          aria-label={`Email for ${p.productLabel} restock alert`}
                          aria-invalid={notifyOpen === p.productId && notifyError ? true : undefined}
                          className="ms-field ms-notify-field flex-1 min-w-0"
                        />
                        <button
                          type="submit"
                          disabled={notifyBusy === p.productId}
                          className="ms-label ms-key ms-key-ink px-3 shrink-0 disabled:opacity-40"
                        >
                          {notifyBusy === p.productId ? "…" : "→"}
                        </button>
                      </div>
                      {notifyOpen === p.productId && notifyError && (
                        <p className="text-[12px] text-red-500" role="alert">
                          {notifyError}
                        </p>
                      )}
                    </form>
                  )}
                </div>

                {/* cursor spotlight — light follows the mouse across the steel */}
                <div className="ms-spot" aria-hidden="true" />
              </div>
            );
          })}

          {/* house plates — welded fillers closing the last row (Task 51) */}
          {Array.from({ length: housePlates }).map((_, i) => (
            <HousePlate key={`plate-${i}`} index={i} delay={plateDelay} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
