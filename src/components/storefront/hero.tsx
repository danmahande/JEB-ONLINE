"use client";

import { useSky, type DayPart } from "@/lib/store";

const HERO_LABEL: Record<DayPart, string> = {
  dawn: "GOOD MORNING — TODAY'S HARVEST JUST LANDED",
  day: "UGANDA ORIGIN — EXPORTING ACROSS THE EAC & WORLDWIDE",
  golden: "GOOD EVENING — FRESH QUOTES ACROSS THE EAC & WORLDWIDE",
  night: "ORDER OVERNIGHT — WE PICK & PACK BY DAWN",
};

export default function Hero({
  onShop,
  query,
  onQuery,
}: {
  onShop: () => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const natural = useSky((s) => s.natural);
  const override = useSky((s) => s.override);
  const sky = override ?? natural;

  return (
    <section className="relative bg-ink text-white overflow-hidden" aria-label="Hero">
      {/* full-bleed HD composite: maize field dissolving into a warehouse */}
      <div className="absolute inset-0">
        <img
          src="/products/__hero.png"
          alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
          className="ms-kenburns absolute inset-0 h-full w-full object-cover"
        />
        {/* drifting clouds — sit under the day-part tints so dawn/golden warm them */}
        <div className="ms-cloud ms-cloud-a" aria-hidden="true" />
        <div className="ms-cloud ms-cloud-b" aria-hidden="true" />
        {/* living sky — day-part tints crossfade in after mount (SSR = day) */}
        <div className={`ms-sky ms-sky-dawn ${sky === "dawn" ? "ms-sky-on" : ""}`} aria-hidden="true" />
        <div className={`ms-sky ms-sky-golden ${sky === "golden" ? "ms-sky-on" : ""}`} aria-hidden="true" />
        <div className={`ms-sky ms-sky-night ${sky === "night" ? "ms-sky-on" : ""}`} aria-hidden="true" />
        {/* navy veil — dark behind the text zone, clearing toward the horizon */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/45 to-ink/10"
          aria-hidden="true"
        />
        {/* stars — above the veil so they stay crisp at night */}
        <div className={`ms-stars ${sky === "night" ? "ms-sky-on" : ""}`} aria-hidden="true" />
        {/* warm haze — dissolves the photo into the catalog below */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 md:h-28 bg-gradient-to-t from-[#FBF6EC] via-[#FBF6EC]/25 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 px-4 md:px-8 pt-8 md:pt-10 pb-8 md:pb-12">
        <p key={sky} className="ms-label ms-fade-swap mb-4 md:mb-5 opacity-80 text-white">
          {HERO_LABEL[sky]}
        </p>
        {/* kept for SEO/a11y only — not rendered visually */}
        <h1 className="sr-only">Meridian Supply Co. — Grains &amp; Hardware</h1>

        {/* search — the storefront's primary entry point, machined as a
            steel channel: cabinet face outside, dark milled well inside,
            brand-orange key cap. Sinks 2px into its housing on focus. */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onShop();
          }}
          className="ms-search max-w-xl"
        >
          <span className="ms-search-mark" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search maize flour, cement, iron sheets…"
            aria-label="Search products"
            className="ms-search-input"
          />
          <button type="submit" className="ms-label ms-search-key px-5 md:px-8 shrink-0">
            SEARCH
          </button>
        </form>

        <button
          onClick={onShop}
          className="ms-label mt-4 md:mt-5 bg-brand text-white px-8 py-4 hover:bg-brand-dark transition-colors"
        >
          ENTER CATALOG ↓
        </button>
      </div>
    </section>
  );
}
