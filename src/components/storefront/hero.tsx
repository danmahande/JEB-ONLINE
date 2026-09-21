"use client";

export default function Hero({ onShop }: { onShop: () => void }) {
  return (
    <section className="relative bg-black text-white overflow-hidden" aria-label="Hero">
      {/* B/W warehouse image */}
      <div className="absolute inset-0 opacity-60">
        { }
        <img
          src="/products/__hero.png"
          alt="Stacked grain sacks and bundled roofing sheets in a concrete warehouse"
          className="w-full h-full object-cover grayscale"
        />
      </div>

      <div className="relative z-10 px-4 md:px-8 pt-16 pb-10 md:pt-28 md:pb-16 min-h-[70vh] md:min-h-[78vh] flex flex-col justify-between">
        <div>
          <p className="kz-label mb-6 opacity-80">
            UGANDA ORIGIN — EXPORTING ACROSS THE EAC & WORLDWIDE
          </p>
          <h1 className="kz-display text-[15vw] md:text-[9.5vw]">
            GRAINS &<br />
            HARDWARE
          </h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mt-10">
          <p className="max-w-md text-sm md:text-base font-medium leading-relaxed opacity-90">
            Staple grains milled and sorted in Uganda. Building materials straight
            from regional factories. One catalog, five currencies, duties and
            freight calculated before you pay. No noise — just trade.
          </p>
          <button
            onClick={onShop}
            className="kz-label self-start bg-white text-black px-8 py-4 hover:bg-black hover:text-white border border-white transition-colors"
          >
            ENTER CATALOG ↓
          </button>
        </div>
      </div>
    </section>
  );
}
