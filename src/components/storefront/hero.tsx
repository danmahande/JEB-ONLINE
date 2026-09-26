"use client";

/* The storefront lives in permanent daylight (Task 58 — the day/night
   machinery was removed with its footer control): one fixed greeting
   line, no tint layers, no stars. */
const HERO_LINE = "UGANDA ORIGIN — EXPORTING ACROSS THE EAC & WORLDWIDE";

export default function Hero({
  onShop,
  query,
  onQuery,
}: {
  onShop: () => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    /* full-bleed — the display window runs wall to wall (no side gutters),
       matching the footer and the rack below */
    <section className="pt-3 md:pt-5" aria-label="Hero">
      <h1 className="sr-only">Meridian Supply Co. — Grains &amp; Hardware</h1>

      {/* the display window — the photo hangs in the same steel frame the
          catalog rack is built from (.ms-shopfront material), cut back to
          the original hero strip height (Task 54). The day-part line and
          the primary controls are bolted to the glass itself; a shaded top
          edge keeps them legible while the photo stays vivid below. */}
      <div className="ms-shopfront">
        <div className="relative h-[240px] md:h-[280px] lg:h-[310px] overflow-hidden rounded-[4px]">
          {/* HD composite: maize field dissolving into a warehouse */}
          <img
            src="/products/__hero.png"
            alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
            className="ms-kenburns absolute inset-0 h-full w-full object-cover"
          />
          {/* drifting clouds — the window's only ambient weather, kept subtle */}
          <div className="ms-cloud ms-cloud-a" aria-hidden="true" />
          <div className="ms-cloud ms-cloud-b" aria-hidden="true" />
          {/* shaded top edge — legibility for the mounted signage + controls */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/25 to-transparent"
            aria-hidden="true"
          />

          {/* signage + controls, mounted on the glass */}
          <div className="absolute inset-0 z-10 flex flex-col items-start gap-2.5 p-4 md:gap-3 md:p-6">
            <p className="ms-label text-white/85">{HERO_LINE}</p>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center md:gap-3">
              {/* search — the same machined steel channel as the header
                  rail (Task 52); bolted to the window glass and sharing
                  one query state with both. */}
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

          {/* the pane — one sheet of glass over the whole display */}
          <span className="ms-glass" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
