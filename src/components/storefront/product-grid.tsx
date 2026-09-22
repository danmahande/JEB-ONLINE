"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, ProductVariant, RegionConfig } from "@/lib/types";
import { fmt } from "@/lib/format";
import { useCart, useFly } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const TABS = [
  { key: "ALL", label: "ALL" },
  { key: "GRAINS", label: "GRAINS" },
  { key: "HARDWARE", label: "HARDWARE" },
];

// origin codes -> display names (drawer interior)
const ORIGIN_LABELS: Record<string, string> = {
  UG: "UGANDA",
  KE: "KENYA",
  TZ: "TANZANIA",
  RW: "RWANDA",
  BI: "BURUNDI",
};

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
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const addTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [picked, setPicked] = useState<Record<string, number>>({}); // productId -> variant index
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyDone, setNotifyDone] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null); // which drawer is pulled out
  const addLine = useCart((s) => s.addLine);
  const flyTo = useFly((s) => s.flyTo);
  const { toast } = useToast();
  const active = regions.find((r) => r.region === region);

  // clear any pending "✓ ADDED" reset timers on unmount
  useEffect(
    () => () => {
      Object.values(addTimers.current).forEach(clearTimeout);
    },
    []
  );

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

  function quickAdd(p: Product, v?: ProductVariant, btn?: HTMLElement) {
    if (!v || p.currentStock <= 0) return;
    addLine({
      productId: p.productId,
      slug: p.slug,
      productLabel: p.productLabel,
      brand: p.brand,
      variantLabel: v.label,
      unitPriceUsd: p.unitSellingPrice + (v?.priceDelta || 0),
      weightKg: v.weightKg,
      qty: 1,
      image: p.image,
      maxStock: p.currentStock,
    });
    // fly a dot from the button to the cart badge — the badge pop is the payoff
    if (btn) {
      const r = btn.getBoundingClientRect();
      flyTo(r.left + r.width / 2, r.top + r.height / 2);
    }
    toast({
      title: "ADDED TO CART",
      description: `${p.productLabel} (${v.label.toLowerCase()}) — open the cart to check out.`,
    });
    // button morphs to "✓ ADDED" for a moment — feedback lands on the control
    setJustAdded((s) => new Set(s).add(p.productId));
    clearTimeout(addTimers.current[p.productId]);
    addTimers.current[p.productId] = setTimeout(() => {
      setJustAdded((s) => {
        const next = new Set(s);
        next.delete(p.productId);
        return next;
      });
    }, 1300);
  }

  return (
    <section
      id="catalog"
      className="bg-[linear-gradient(to_bottom,#FBF6EC_0px,#F8FAFC_360px)] px-4 md:px-8 py-10 md:py-14"
      aria-label="Catalog"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h2 className="ms-display text-4xl md:text-6xl">
          CATALOG
          <sup className="text-sm md:text-base align-super ml-2 text-brand">
            {String(filtered.length).padStart(2, "0")}
          </sup>
        </h2>
        <div className="flex border border-line bg-white" role="tablist" aria-label="Category filter">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`ms-label px-4 md:px-6 py-3 border-r border-line last:border-r-0 transition-colors ${
                tab === t.key ? "bg-brand text-white" : "hover:bg-ink hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {q && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
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

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 md:gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-200 animate-pulse rounded-lg" />
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
            className="ms-label bg-brand text-white px-6 py-3 hover:bg-brand-dark transition-colors"
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
            const open = openId === p.productId;
            return (
              <div
                key={p.productId}
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                onMouseMove={(e) => {
                  // cabinet sheen — the spotlight follows the cursor via CSS vars, no re-render
                  const el = e.currentTarget;
                  const r = el.getBoundingClientRect();
                  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  el.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
                className={`ms-tile ms-tile-in group relative flex flex-col border border-line ${
                  open ? "ms-open" : ""
                } ${out ? "ms-oos" : ""}`}
              >
                <button
                  onClick={() => setOpenId(open ? null : p.productId)}
                  className="relative block w-full text-left"
                  aria-expanded={open}
                  aria-controls={`ms-drawer-${p.productId}`}
                  aria-label={open ? `Close ${p.productLabel} drawer` : `Open ${p.productLabel} drawer`}
                >
                  <div className="aspect-square overflow-hidden bg-neutral-100">
                    <img
                      src={p.image || "/products/placeholder.png"}
                      alt={p.productLabel}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>

                {/* badges */}
                <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none">
                  <span className="ms-label rounded bg-white border border-line px-2 py-1 text-ink">
                    {p.category}
                  </span>
                  {active?.isEac && (
                    <span className="ms-label rounded bg-emerald-500 text-white px-2 py-1">
                      0% DUTY
                    </span>
                  )}
                  {p.category === "GRAINS" && !out && (
                    <span className="ms-label rounded inline-flex items-center gap-1.5 bg-white/90 border border-emerald-200 text-emerald-700 px-2 py-1">
                      <span className="ms-fresh-dot" aria-hidden="true" />
                      HARVESTED THIS WEEK
                    </span>
                  )}
                </div>
                {out && (
                  <span className="ms-label rounded absolute top-2 right-2 bg-red-500 text-white px-2 py-1">
                    SOLD OUT
                  </span>
                )}

                {/* info panel */}
                <div className="flex flex-col gap-1.5 flex-1 p-3">
                  <p className="ms-label ms-file-label truncate" title={p.brand}>{p.brand}</p>
                  <button
                    onClick={() => setOpenId(open ? null : p.productId)}
                    aria-expanded={open}
                    aria-controls={`ms-drawer-${p.productId}`}
                    className="text-left font-bold text-sm leading-snug line-clamp-2 hover:text-brand transition-colors"
                    title={p.productLabel}
                  >
                    {p.productLabel}
                  </button>
                  <p
                    className={`text-xs font-semibold ${
                      out ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600"
                    }`}
                  >
                    {out
                      ? "Sold out — more arriving soon"
                      : low
                        ? `Only ${p.currentStock} left in stock`
                        : `In stock — ${p.currentStock} ${p.unit.toLowerCase()}${p.currentStock === 1 ? "" : "s"}`}
                  </p>
                  <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
                    <div className="min-w-0">
                      {/* key={region} remounts on currency switch — replays the flash */}
                      <span
                        key={region}
                        className="ms-price ms-price-flash text-lg tracking-tight text-brand leading-none whitespace-nowrap"
                      >
                        {active ? fmt(priceUsd, active) : `$${priceUsd.toFixed(2)}`}
                      </span>
                      {variants.length > 1 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {variants.map((vv, vi) => (
                            <button
                              key={vv.label}
                              onClick={() => setPicked((s) => ({ ...s, [p.productId]: vi }))}
                              aria-pressed={vi === idx}
                              className={`ms-weight-toggle ${vi === idx ? "is-on" : ""}`}
                            >
                              {vv.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="ms-label text-hush mt-1 truncate" title={v?.label}>
                          {v?.label || p.weight || p.unit}
                        </p>
                      )}
                    </div>
                    {out ? (
                      notifyDone.has(p.productId) ? (
                        <span className="ms-label text-emerald-600 shrink-0">✓ ON THE LIST</span>
                      ) : (
                        <button
                          onClick={() =>
                            setNotifyOpen((o) => (o === p.productId ? null : p.productId))
                          }
                          aria-expanded={notifyOpen === p.productId}
                          className={`ms-label shrink-0 px-3 py-2.5 border transition-colors ${
                            notifyOpen === p.productId
                              ? "border-ink bg-ink text-white"
                              : "border-line bg-white hover:bg-ink hover:text-white"
                          }`}
                        >
                          {notifyOpen === p.productId ? "✕" : "NOTIFY ME"}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={(e) => quickAdd(p, v, e.currentTarget)}
                        className={`ms-label px-3 py-2.5 shrink-0 transition-colors ${
                          justAdded.has(p.productId)
                            ? "bg-ink text-white"
                            : "bg-brand text-white hover:bg-brand-dark"
                        }`}
                        aria-label={`Add ${p.productLabel} to cart`}
                      >
                        {justAdded.has(p.productId) ? "✓ ADDED" : "ADD"}
                      </button>
                    )}
                  </div>

                  {/* restock notify form — sold-out tiles only */}
                  {out && notifyOpen === p.productId && !notifyDone.has(p.productId) && (
                    <form
                      className="flex gap-1.5"
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
                        className="ms-label bg-ink text-white px-3 hover:bg-ink-soft transition-colors shrink-0"
                      >
                        →
                      </button>
                    </form>
                  )}
                </div>

                {/* the drawer — slides out from under the steel face.
                    hover cracks it open, click pulls it fully out */}
                <div className="ms-drawer" id={`ms-drawer-${p.productId}`} inert={!open}>
                  <div className="ms-drawer-inner">
                    <div className="ms-drawer-well">
                      <div className="ms-drawer-lip" aria-hidden="true">
                        <span className="ms-label">{p.category}</span>
                        <span className="ms-label">PRODUCT DATA</span>
                      </div>
                      <div className="ms-drawer-body">
                      {p.description && <p className="ms-drawer-desc">{p.description}</p>}
                      <dl>
                        <div className="ms-drawer-row">
                          <dt>SKU</dt>
                          <dd>{p.productId}</dd>
                        </div>
                        <div className="ms-drawer-row">
                          <dt>HS CODE</dt>
                          <dd>{p.hsCode || "—"}</dd>
                        </div>
                        <div className="ms-drawer-row">
                          <dt>ORIGIN</dt>
                          <dd>{ORIGIN_LABELS[p.originCountry] ?? p.originCountry}</dd>
                        </div>
                        <div className="ms-drawer-row">
                          <dt>NET WEIGHT</dt>
                          <dd>{v ? `${v.weightKg} KG` : (p.weight || p.unit).toUpperCase()}</dd>
                        </div>
                        <div className="ms-drawer-row">
                          <dt>IN STOCK</dt>
                          <dd>
                            {p.currentStock} {p.unit.toUpperCase()}
                          </dd>
                        </div>
                      </dl>
                      <button onClick={() => onSelect(p)} className="ms-label ms-drawer-cta">
                        OPEN FULL SPEC SHEET →
                      </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* cursor spotlight — light follows the mouse across the steel */}
                <div className="ms-spot" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
