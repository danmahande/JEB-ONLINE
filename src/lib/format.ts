// Pricing + formatting helpers (client-side quote preview).
// The server re-computes authoritative totals on checkout.

import type { CartLine, RegionConfig, Quote } from "./types";
import { leviesFor } from "./levies";

export function quoteCart(lines: CartLine[], region: RegionConfig): Quote {
  const subtotal = lines.reduce((s, l) => s + l.unitPriceUsd * l.qty, 0);
  const totalWeightKg = lines.reduce((s, l) => s + l.weightKg * l.qty, 0);
  const duty = subtotal * region.dutyRate;
  const levyLines = leviesFor(region.region).map((l) => ({
    code: l.code,
    rate: l.rate,
    amount: subtotal * l.rate,
  }));
  const leviesTotal = levyLines.reduce((s, l) => s + l.amount, 0);
  // Only duty-like charges join the VAT taxable value (Kenya/DRC practice);
  // e.g. Rwanda's 5% withholding tax is an income-tax prepayment, not a levy.
  const leviesInVatBase = leviesFor(region.region)
    .filter((l) => l.inVatBase)
    .reduce((s, l) => s + subtotal * l.rate, 0);
  const vat = (subtotal + duty + leviesInVatBase) * region.vatRate;
  const shipping = region.shippingBase + totalWeightKg * region.shippingPerKg;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    subtotal: round2(subtotal),
    duty: round2(duty),
    levies: levyLines.map((l) => ({ ...l, amount: round2(l.amount) })),
    leviesTotal: round2(leviesTotal),
    vat: round2(vat),
    shipping: round2(shipping),
    total: round2(subtotal + duty + leviesTotal + vat + shipping),
    totalWeightKg: round2(totalWeightKg),
  };
}

/** Format a USD amount into the display currency of a region. */
export function fmt(usd: number, region: RegionConfig): string {
  const value = usd * region.rateToUsd;
  if (region.currency === "USD") {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Local East African currencies: round sensibly
  const rounded =
    region.rateToUsd >= 1000
      ? Math.round(value) // UGX, TZS, RWF — no cents
      : Math.round(value * 10) / 10; // KES — one decimal
  return `${region.symbol} ${rounded.toLocaleString("en-US", { maximumFractionDigits: 1 })}`;
}

export function fmtWeight(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)}T` : `${Math.round(kg * 10) / 10}KG`;
}
