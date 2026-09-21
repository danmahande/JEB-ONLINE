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
    <section
      className="relative bg-gradient-to-b from-[#16233F] via-[#1B2A4A] to-[#3A5686] text-white overflow-hidden"
      aria-label="Hero"
    >
      <div className="relative z-10 px-4 md:px-8 pt-10 md:pt-12 pb-6 md:pb-8">
        <p className="ms-label mb-3 md:mb-4 opacity-80 text-white">
          UGANDA ORIGIN — EXPORTING ACROSS THE EAC &amp; WORLDWIDE
        </p>
        <h1 className="ms-display text-[10vw] md:text-[5vw]">
          GRAINS &amp;<br />
          HARDWARE
        </h1>

        {/* search — the storefront's primary entry point */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onShop();
          }}
          className="mt-5 md:mt-6 flex max-w-xl bg-white p-1.5 shadow-xl"
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

        <button
          onClick={onShop}
          className="ms-label mt-5 md:mt-6 bg-brand text-white px-8 py-4 hover:bg-white hover:text-ink border border-brand transition-colors"
        >
          ENTER CATALOG ↓
        </button>
      </div>

      {/* thin HD strip: maize field dissolving into a warehouse — the horizon line */}
      <div className="relative h-36 md:h-56">
        <img
          src="/products/__hero.png"
          alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* melts out of the sky above... */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#3A5686] via-[#3A5686]/15 to-transparent"
          aria-hidden="true"
        />
        {/* ...and dissolves into warm morning haze the catalog rises from */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#FBF6EC] via-[#FBF6EC]/20 to-transparent"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
