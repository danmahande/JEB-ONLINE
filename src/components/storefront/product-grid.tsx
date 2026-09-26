"use client";

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

export default function ProductGrid({
  products,
  regions,
  region,
  onSelect,
  loading,
  query,
  onClearQuery,
}: {
  products: Product[];
  regions: RegionConfig[];
  region: string;
  onSelect: (p: Product) => void;
  loading: boolean;
  query: string;
  onClearQuery: () => void;
}) {
  const [tab, setTab] = useState("ALL");
  const [picked, setPicked] = useState<Record<string, number>>({}); // productId -> variant index
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyDone, setNotifyDone] = useState<Set<string>>(new Set());
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
      className="bg-mist px-4 md:px-8 py-10 md:py-14"
      aria-label="Catalog"
    >
      {/* fascia board — the toolbar mounts flush on the shopfront frame below */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-t-lg border border-b-0 border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
        <div className="min-w-0">
          {/* the rack counter — replays the greeting swap whenever the count moves */}
          <p key={loading ? "loading" : `${tab}|${q}|${filtered.length}`} className="ms-label ms-fade-swap mb-1.5 text-hush">
            {loading
              ? "CHECKING THE RACK…"
              : `${filtered.length} ${filtered.length === 1 ? "LINE" : "LINES"} ON THE RACK`}
          </p>
          <h2 className="ms-display text-2xl md:text-3xl leading-none tracking-tight">
            CATALOG
            <span className="ml-1.5 inline-block h-2 w-2 bg-brand align-middle" aria-hidden="true" />
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
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-line animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
                {/* the slab&apos;s base — extruded steel thickness hanging
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
                  aria-label={`View ${p.productLabel} details`}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={p.image || "/products/placeholder.png"}
                      alt={p.productLabel}
                      loading="lazy"
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p);
                        }}
                        className="ms-label ms-key px-3 py-2.5 shrink-0 ml-auto"
                        aria-label={`Buy ${p.productLabel} — choose pack and quantity`}
                      >
                        BUY
                      </button>
                    )}
                  </div>

                  {/* restock notify form — sold-out tiles only */}
                  {out && notifyOpen === p.productId && !notifyDone.has(p.productId) && (
                    <form
                      className="flex gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onSubmit={(e) => {
                        e.preventDefault();
                        setNotifyDone((s) => new Set(s).add(p.productId));
                        setNotifyOpen(null);
                        toast({
                          title: "WE'LL NOTIFY YOU",
                          description: `${p.productLabel} — restock alert set for ${notifyEmail}.`,
                        });
                        setNotifyEmail("");
                      }}
                    >
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="you@company.com"
                        aria-label={`Email for ${p.productLabel} restock alert`}
                        className="ms-field ms-notify-field flex-1 min-w-0"
                      />
                      <button
                        type="submit"
                        className="ms-label ms-key ms-key-ink px-3 shrink-0"
                      >
                        →
                      </button>
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
