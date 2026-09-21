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
      <div className="relative z-10 px-4 md:px-8 pt-14 md:pt-20 pb-8 md:pb-10">
        <p className="ms-label mb-5 md:mb-6 opacity-80 text-white">
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
          className="mt-7 md:mt-9 flex max-w-xl bg-white p-1.5 shadow-xl"
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

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mt-8 md:mt-10">
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

      {/* thin HD strip: maize field dissolving into a warehouse — full color, edge to edge */}
      <div className="relative h-36 md:h-56">
        <img
          src="/products/__hero.png"
          alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ink via-ink/10 to-transparent"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
