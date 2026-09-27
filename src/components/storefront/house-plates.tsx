/*
 * House plates — welded steel filler plates that close the last row of the
 * catalog rack. The shopfront grid is physical: an unfinished cell reads as
 * a missing pane, so every remainder slot after the final product gets a
 * branded service plate (bulk, sourcing, cross-border, fulfillment, brand).
 * Tone is deliberately quieter than the product cabinets — darker, cut flush
 * with the frame (no socket, no raise) — so goods stay the loudest thing on
 * the wall and the plates read as shop signage, not empty stock.
 */

const HOUSE_PLATES: { kicker: string; headline: string; body: string }[] = [
  {
    kicker: "BULK & CONTRACT",
    headline: "By the truckload",
    body: "Cement, roofing and grains on contract terms — pricing for retailers, institutions and NGOs.",
  },
  {
    kicker: "SOURCE ON REQUEST",
    headline: "Not on the shelf?",
    body: "Our procurement desk tracks any line across the EAC — usually within 48 hours.",
  },
  {
    kicker: "CROSS-BORDER, QUOTED",
    headline: "No surprise fees",
    body: "Duties, VAT and freight are estimated per destination before you pay. Kampala · Nairobi · Kigali · Dar.",
  },
  {
    kicker: "FULFILLMENT BUILT-IN",
    headline: "Order to doorstep",
    body: "Stock decrements, picking and driver runsheets follow every order. Cash on delivery available.",
  },
  {
    kicker: "UGANDA ORIGIN",
    headline: "Meridian Supply Co.",
    body: "Grains milled & sorted in Kampala. Hardware sourced to spec. Exporting across the EAC & worldwide.",
  },
];

export function HousePlate({ index, delay }: { index: number; delay: number }) {
  const plate = HOUSE_PLATES[index % HOUSE_PLATES.length];
  return (
    <div
      className="ms-plate ms-plate-in relative flex flex-col gap-2 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 shrink-0 bg-brand" aria-hidden="true" />
        <span className="ms-label text-[#c9c7ba]">{plate.kicker}</span>
      </span>
      <p className="ms-display text-[15px] leading-tight text-[#f4f3ea]">{plate.headline}</p>
      {/* px-exact content floor (Task 57 gauge): text-xs renders 10.2px at
          the 85% dial — the smallest body copy in the system, on the darkest
          face. 12px matches the engraved-content floor used everywhere else. */}
      <p className="text-[12px] leading-relaxed text-[#ecebe2]/70">{plate.body}</p>
    </div>
  );
}
