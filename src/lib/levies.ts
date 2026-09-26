// National border levies that still apply on import — ON TOP of (zero) EAC
// import duty. These are the real, still-existing charges, verified September
// 2026 against: PwC Worldwide Tax Summaries (KE post-Finance Act 2026, TZ
// FY2026/27, RW, CD Apr 2026), Kenya's Miscellaneous Fees and Levies Act,
// trade.gov DRC country commercial guide, TRA/RRA/URA portals (worklog Task 62).
//
// Deliberately NOT quoted here (product-specific or non-universal):
//   · excise duties on specific goods — all corridors
//   · Kenya's EIPL (3/10/17.5%) — statutorily excluded for EAC-origin goods
//   · Tanzania's RDL 2% — NOT charged: duty-exempt (EAC-origin) goods are exempt
//   · Rwanda IDL 1.5% / AU levy 0.2% — extra-EAC imports only, EAC-origin exempt
//   · county cess, permits, plastic-packaging levies, DRC provincial charges

export interface BorderLevy {
  /** short invoice code, e.g. IDF */
  code: string;
  /** what the charge is */
  label: string;
  /** fraction of the customs value (goods subtotal) */
  rate: number;
  /** whether this charge joins the VAT taxable value (KE/DRC practice) */
  inVatBase: boolean;
}

export const BORDER_LEVIES: Record<string, BorderLevy[]> = {
  // Kenya: Import Declaration Fee + Railway Development Levy — payable on ALL
  // imports incl. intra-EAC; FA2026 narrowed exemptions to aviation/LPG only.
  KE: [
    { code: "IDF", label: "Import declaration fee", rate: 0.025, inVatBase: true },
    { code: "RDL", label: "Railway development levy", rate: 0.02, inVatBase: true },
  ],
  // Tanzania: Destination Inspection Fee (1% FOB, quoted on customs value).
  TZ: [{ code: "DIF", label: "Destination inspection fee", rate: 0.01, inVatBase: true }],
  // Rwanda: Quality Inspection Fee always applies; 5% withholding tax is an
  // advance income-tax charge (creditable, so outside the VAT base).
  RW: [
    { code: "QIF", label: "Quality inspection fee", rate: 0.002, inVatBase: true },
    { code: "WHT", label: "Import withholding tax (creditable)", rate: 0.05, inVatBase: false },
  ],
  // DR Congo: para-fiscal stack on the transitional corridor.
  CD: [
    { code: "ADMIN", label: "Administrative payment", rate: 0.02, inVatBase: true },
    { code: "OCC", label: "Control office (OCC) fee", rate: 0.015, inVatBase: true },
    { code: "INSP", label: "Pre-shipment inspection", rate: 0.0075, inVatBase: true },
  ],
};

export function leviesFor(region: string): BorderLevy[] {
  return BORDER_LEVIES[region] ?? [];
}

/** 0.025 -> "2.5%", 0.0075 -> "0.75%" — trailing zeros trimmed. */
export function pct(rate: number): string {
  return `${+(rate * 100).toFixed(2)}%`;
}

/** "IDF 2.5% + RDL 2%" — used on quote rows and the checkout spec line. */
export function levyTag(region: string): string {
  return leviesFor(region)
    .map((l) => `${l.code} ${pct(l.rate)}`)
    .join(" + ");
}
