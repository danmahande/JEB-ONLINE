"use client";

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
    <section className="relative bg-ink text-white overflow-hidden" aria-label="Hero">
      {/* navy-tinted composite: maize field dissolving into a warehouse */}
      <div className="absolute inset-0 opacity-60">
        <img
          src="/products/__hero.png"
          alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" aria-hidden="true" />

      <div className="relative z-10 px-4 md:px-8 pt-16 pb-10 md:pt-28 md:pb-16 min-h-[70vh] md:min-h-[78vh] flex flex-col justify-between">
        <div>
          <p className="ms-label mb-6 opacity-80 text-white">
            UGANDA ORIGIN — EXPORTING ACROSS THE EAC &amp; WORLDWIDE
          </p>
          <h1 className="ms-display text-[15vw] md:text-[9.5vw]">
            GRAINS &<br />
            HARDWARE
          </h1>

          {/* search — the storefront's primary entry point */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onShop();
            }}
            className="mt-8 md:mt-10 flex max-w-xl bg-white p-1.5 shadow-xl"
          >
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search maize flour, cement, iron sheets…"
              aria-label="Search products"
              className="ms-field flex-1 min-w-0"
            />
            <button
              type="submit"
              className="ms-label bg-brand text-white px-5 md:px-8 hover:bg-brand-dark transition-colors shrink-0"
            >
              SEARCH
            </button>
          </form>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mt-10">
          <p className="max-w-md text-sm md:text-base font-medium leading-relaxed opacity-90">
            Staple grains milled and sorted in Uganda. Building materials straight
            from regional factories. One catalog, five currencies, duties and
            freight calculated before you pay. No noise — just trade.
          </p>
          <button
            onClick={onShop}
            className="ms-label self-start bg-brand text-white px-8 py-4 hover:bg-white hover:text-ink border border-brand transition-colors"
          >
            ENTER CATALOG ↓
          </button>
        </div>
      </div>
    </section>
  );
}
