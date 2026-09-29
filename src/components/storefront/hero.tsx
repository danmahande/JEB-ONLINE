"use client";

import Image from "next/image";

/* The storefront lives in permanent daylight (Task 58 — the day/night
   machinery was removed with its footer control): one fixed greeting
   line, no tint layers, no stars. */
const HERO_LINE = "UGANDA ORIGIN — EXPORTING ACROSS THE EAC & WORLDWIDE";

/* Option A (user decision): the hero is a display window, not a search
   surface. Exactly ONE search lives on the page — the header channel —
   so the hero carries the stock list line and two wired CTAs instead,
   in a frame cut back even shorter. */
export default function Hero({
  onShop,
  onTrack,
}: {
  onShop: () => void;
  onTrack: () => void;
}) {
  return (
    /* full-bleed — the display window runs wall to wall (no side gutters),
        matching the footer and the rack below */
    <section className="pt-3 md:pt-5" aria-label="Hero">
      <h1 className="sr-only">Meridian Supply Co. — Grains &amp; Hardware</h1>

      {/* the display window — the photo hangs in the same steel frame the
          catalog rack is built from (.ms-shopfront material). With the
          search retired the controls are pure signage: one greeting line,
          one stock-list line, two keys. A shaded top edge keeps them
          legible while the photo stays vivid below. */}
      <div className="ms-shopfront">
        <div className="relative h-[180px] md:h-[210px] lg:h-[240px] overflow-hidden rounded-[4px]">
          {/* HD composite: maize field dissolving into a warehouse — the LCP
              element, so it preloads through the optimizer */}
          <Image
            src="/products/__hero.png"
            alt="Maize field in the hills blending into a warehouse stacked with goods and a forklift"
            fill
            priority
            sizes="100vw"
            className="ms-kenburns object-cover"
          />
          {/* drifting clouds — the window's only ambient weather, kept subtle */}
          <div className="ms-cloud ms-cloud-a" aria-hidden="true" />
          <div className="ms-cloud ms-cloud-b" aria-hidden="true" />
          {/* shaded top edge — legibility for the mounted signage + controls */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/25 to-transparent"
            aria-hidden="true"
          />

          {/* signage + keys, mounted on the glass */}
          <div className="absolute inset-0 z-10 flex flex-col items-start gap-2 md:gap-2.5 p-4 md:p-6">
            <p className="ms-label text-white/85">{HERO_LINE}</p>
            <p className="ms-display text-xl md:text-2xl leading-none tracking-tight text-white">
              ESSENTIAL GOODS YOU CAN TRUST
              <span
                className="ml-1.5 inline-block h-2 w-2 bg-brand align-middle"
                aria-hidden="true"
              />
            </p>
            <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
              <button
                onClick={onShop}
                className="ms-label bg-brand text-white px-6 md:px-8 py-3.5 hover:bg-brand-dark transition-colors"
              >
                ENTER CATALOG ↓
              </button>
              <button
                onClick={onTrack}
                className="ms-label border border-white/70 text-white px-5 md:px-6 py-3.5 hover:border-white hover:bg-white/10 transition-colors"
              >
                TRACK ORDER
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