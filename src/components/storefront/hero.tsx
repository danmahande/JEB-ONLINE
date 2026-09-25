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
    <section className="px-4 md:px-8 pt-3 md:pt-5" aria-label="Hero">
      {/* fascia board — the same white toolbar the CATALOG rack mounts
          under: shop signage left, primary controls bolted on right.
          Same rounded top, hairline border, flush onto the frame below. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-t-lg border border-b-0 border-line bg-white px-4 py-3 md:px-5 md:py-3.5">
        <div className="min-w-0">
          <p key={sky} className="ms-label ms-fade-swap mb-1.5 text-hush">
            {HERO_LABEL[sky]}
          </p>
          {/* kept visible now — the fascia carries the shop signage */}
          <h1 className="ms-display text-2xl md:text-3xl leading-none tracking-tight">
            <span className="sr-only">Meridian Supply Co. — </span>
            Grains &amp; Hardware
            <span
              className="ml-1.5 inline-block h-2 w-2 bg-brand align-middle"
              aria-hidden="true"
            />
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2.5 sm:w-auto sm:gap-3">
          {/* search — the same machined steel channel as the header rail
              (Task 52); mounted on the fascia like the tabs are on the
              catalog toolbar. Shares one query state with both. */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onShop();
            }}
            className="ms-search w-full sm:w-80 lg:w-96"
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
            <button type="submit" className="ms-label ms-search-key px-5 md:px-7 shrink-0">
              SEARCH
            </button>
          </form>

          <button
            onClick={onShop}
            className="ms-label bg-brand text-white px-6 md:px-8 py-4 hover:bg-brand-dark transition-colors shrink-0"
          >
            ENTER CATALOG ↓
          </button>
        </div>
      </div>

      {/* the display window — the photo hangs in the same steel frame the
          catalog rack is built from (.ms-shopfront material): 2px machined
          border, warm-grey frame steel, 10px mullion margin. The living sky
          crosses it and the pane carries the same .ms-glass the goods sit
          behind — including the day-part wash and the night display-case
          glow, driven by data-sky exactly like the rack below. */}
      <div className="ms-shopfront" data-sky={sky}>
        <div className="relative h-[300px] md:h-[380px] lg:h-[440px] overflow-hidden rounded-[4px]">
          {/* HD composite: maize field dissolving into a warehouse */}
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
          {/* stars — seen through the glass, above the tints so they stay crisp */}
          <div className={`ms-stars ${sky === "night" ? "ms-sky-on" : ""}`} aria-hidden="true" />
          {/* the pane — one sheet of glass over the whole display */}
          <span className="ms-glass" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
