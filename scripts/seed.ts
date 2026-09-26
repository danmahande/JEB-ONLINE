/**
 * Seed: Meridian Supply storefront catalog
 * Field names intentionally mirror the upstream ERP's Product model so rows
 * can be synced 1:1 into a real ERP instance later.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const V = (arr: object[]) => JSON.stringify(arr);

const products: any[] = [
  // ---------------- GRAINS (origin Uganda) ----------------
  {
    productId: "GRN-MAIZE-001",
    productLabel: "Maize Flour (Posho)",
    slug: "maize-flour-posho",
    description:
      "Grade 1 sifted maize flour, milled in Kampala from Ugandan white maize. EAC standard KEBS/UNBS certified. Bulk export packing, moisture ≤ 13.5%.",
    brand: "MERIDIAN MILLS",
    category: "GRAINS",
    unit: "BAG",
    weight: "25KG",
    unitCost: 14.1,
    unitSellingPrice: 18.4,
    currentStock: 840,
    hsCode: "1102.20",
    variants: V([
      { label: "5KG BAG", priceDelta: -13.5, weightKg: 5 },
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
      { label: "50KG BAG", priceDelta: 17.2, weightKg: 50 },
    ]),
  },
  {
    productId: "GRN-RICE-002",
    productLabel: "Long-Grain Rice",
    slug: "long-grain-rice",
    description:
      "Premium polished long-grain rice, sortex cleaned, broken grain ≤ 5%. Sourced from Mbale irrigated schemes. Ideal for wholesale and institutional supply.",
    brand: "PEARL BASE",
    category: "GRAINS",
    unit: "BAG",
    weight: "25KG",
    unitCost: 25.4,
    unitSellingPrice: 31.8,
    currentStock: 460,
    hsCode: "1006.30",
    variants: V([
      { label: "5KG BAG", priceDelta: -25.0, weightKg: 5 },
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
      { label: "50KG BAG", priceDelta: 28.6, weightKg: 50 },
    ]),
  },
  {
    productId: "GRN-BEANS-003",
    productLabel: "Sugar Beans (Rose Coco)",
    slug: "sugar-beans-rose-coco",
    description:
      "Hand-sorted Rose Coco beans from northern Uganda. Uniform red-speckled grade, weevil-free, double poly-lined 25kg export bags.",
    brand: "MERIDIAN FARM CO",
    category: "GRAINS",
    unit: "BAG",
    weight: "25KG",
    unitCost: 21.8,
    unitSellingPrice: 27.9,
    currentStock: 310,
    hsCode: "0713.33",
    variants: V([
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
      { label: "50KG BAG", priceDelta: 26.4, weightKg: 50 },
    ]),
  },
  {
    productId: "GRN-SORGH-004",
    productLabel: "Sorghum",
    slug: "sorghum",
    description:
      "Red sorghum, feed and brewery grade, tested aflatoxin-free. Bulk commodity for millers and breweries across the EAC.",
    brand: "MERIDIAN FARM CO",
    category: "GRAINS",
    unit: "BAG",
    weight: "50KG",
    unitCost: 16.9,
    unitSellingPrice: 21.6,
    currentStock: 520,
    hsCode: "1007.00",
    variants: V([{ label: "50KG BAG", priceDelta: 0, weightKg: 50 }]),
  },
  {
    productId: "GRN-WHEAT-005",
    productLabel: "Wheat Flour",
    slug: "wheat-flour",
    description:
      "All-purpose baker's wheat flour, protein 11.5%. Fortified per EAC standards. Packed in woven poly bags with inner liner.",
    brand: "MERIDIAN MILLS",
    category: "GRAINS",
    unit: "BAG",
    weight: "25KG",
    unitCost: 18.6,
    unitSellingPrice: 23.75,
    currentStock: 275,
    hsCode: "1101.00",
    variants: V([
      { label: "5KG BAG", priceDelta: -17.8, weightKg: 5 },
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
    ]),
  },
  {
    productId: "GRN-MILLET-006",
    productLabel: "Finger Millet",
    slug: "finger-millet",
    description:
      "Whole-grain finger millet from Teso sub-region. Sun-dried on tarps, thrice winnowed. High demand for porridge flour processors.",
    brand: "MERIDIAN FARM CO",
    category: "GRAINS",
    unit: "BAG",
    weight: "25KG",
    unitCost: 23.1,
    unitSellingPrice: 29.4,
    currentStock: 180,
    hsCode: "1008.21",
    variants: V([{ label: "25KG BAG", priceDelta: 0, weightKg: 25 }]),
  },
  {
    productId: "GRN-SOY-007",
    productLabel: "Soybeans",
    slug: "soybeans",
    description:
      "Yellow soybeans, oil-crush and feed grade, protein ≥ 36%. Suitable for oil millers and aquaculture feed producers.",
    brand: "MERIDIAN FARM CO",
    category: "GRAINS",
    unit: "BAG",
    weight: "50KG",
    unitCost: 26.8,
    unitSellingPrice: 33.2,
    currentStock: 240,
    hsCode: "1201.90",
    variants: V([{ label: "50KG BAG", priceDelta: 0, weightKg: 50 }]),
  },
  // ---------------- HARDWARE ----------------
  {
    productId: "HWD-CEM-001",
    productLabel: "Portland Cement",
    slug: "portland-cement",
    description:
      "CEM II 32.5N Portland cement. Consistent set, regional factory direct. Palletized and shrink-wrapped for cross-border transit.",
    brand: "KARUMA",
    category: "HARDWARE",
    unit: "BAG",
    weight: "50KG",
    unitCost: 6.55,
    unitSellingPrice: 8.6,
    currentStock: 1500,
    hsCode: "2523.29",
    variants: V([
      { label: "25KG BAG", priceDelta: -3.4, weightKg: 25 },
      { label: "50KG BAG", priceDelta: 0, weightKg: 50 },
    ]),
  },
  {
    productId: "HWD-ROOF-002",
    productLabel: "Galvanized Iron Sheets (G.30)",
    slug: "g30-iron-sheets",
    description:
      "Gauge 30 pre-painted galvanized roofing sheets, 3m length, charcoal/black. Corrugated 3V profile. Bundled 10 sheets per strap.",
    brand: "ROOFMAX",
    category: "HARDWARE",
    unit: "SHEET",
    weight: "11KG",
    unitCost: 11.3,
    unitSellingPrice: 14.2,
    currentStock: 620,
    hsCode: "7308.90",
    variants: V([
      { label: "2M SHEET", priceDelta: -4.7, weightKg: 7.5 },
      { label: "3M SHEET", priceDelta: 0, weightKg: 11 },
    ]),
  },
  {
    productId: "HWD-NAIL-003",
    productLabel: "Common Nails",
    slug: "common-nails",
    description:
      "Wire common nails, 2-4 inch mixed, bright finish. Sold in 25kg export cartons. Also stocked in 5kg retail packs.",
    brand: "FORGE & CO",
    category: "HARDWARE",
    unit: "CARTON",
    weight: "25KG",
    unitCost: 20.9,
    unitSellingPrice: 26.5,
    currentStock: 410,
    hsCode: "7317.00",
    variants: V([
      { label: "5KG PACK", priceDelta: -21.2, weightKg: 5 },
      { label: "10KG PACK", priceDelta: -11.9, weightKg: 10 },
      { label: "25KG CARTON", priceDelta: 0, weightKg: 25 },
    ]),
  },
  {
    productId: "HWD-HAMR-004",
    productLabel: "Claw Hammer 16oz",
    slug: "claw-hammer-16oz",
    description:
      "Forged steel claw hammer, 16oz, shock-reducing rubber grip, polished head. Individually hang-tagged retail ready.",
    brand: "FORGE & CO",
    category: "HARDWARE",
    unit: "PIECE",
    weight: "0.65KG",
    unitCost: 3.2,
    unitSellingPrice: 4.4,
    currentStock: 900,
    hsCode: "8205.20",
    variants: V([{ label: "16OZ", priceDelta: 0, weightKg: 0.65 }]),
  },
  {
    productId: "HWD-WHLB-005",
    productLabel: "Heavy-Duty Wheelbarrow",
    slug: "heavy-duty-wheelbarrow",
    description:
      "90L seamless steel tray wheelbarrow, 18-gauge tray, 3.50-8 pneumatic wheel, reinforced handles. 150kg rated load.",
    brand: "SITEPRO",
    category: "HARDWARE",
    unit: "PIECE",
    weight: "17KG",
    unitCost: 21.4,
    unitSellingPrice: 27.8,
    currentStock: 145,
    hsCode: "8716.80",
    variants: V([{ label: "90L TRAY", priceDelta: 0, weightKg: 17 }]),
  },
  {
    productId: "HWD-LOCK-006",
    productLabel: "Steel Padlock 50mm",
    slug: "steel-padlock-50mm",
    description:
      "Laminated steel padlock, 50mm body, brass cylinder, 3 keys included. Master-cartons of 60 pieces for resellers.",
    brand: "IRONCLAD",
    category: "HARDWARE",
    unit: "PIECE",
    weight: "0.4KG",
    unitCost: 2.15,
    unitSellingPrice: 3.1,
    currentStock: 2100,
    hsCode: "8301.10",
    variants: V([{ label: "50MM", priceDelta: 0, weightKg: 0.4 }]),
  },
  {
    productId: "HWD-SHVL-007",
    productLabel: "Round Mouth Shovel",
    slug: "round-mouth-shovel",
    description:
      "Round mouth shovel, pressed steel blade with 7-inch socket, hardwood shaft and YD grip. Farm and construction grade.",
    brand: "SITEPRO",
    category: "HARDWARE",
    unit: "PIECE",
    weight: "1.9KG",
    unitCost: 4.6,
    unitSellingPrice: 6.3,
    currentStock: 530,
    hsCode: "8201.10",
    variants: V([{ label: "SIZE 2", priceDelta: 0, weightKg: 1.9 }]),
  },
];

const regions = [
  {
    region: "UG",
    countryName: "UGANDA",
    currency: "UGX",
    symbol: "USh",
    rateToUsd: 3700,
    dutyRate: 0,
    vatRate: 0.18,
    shippingBase: 5,
    shippingPerKg: 0.05,
    etaDays: "1-2 DAYS",
    isEac: true,
  },
  {
    region: "KE",
    countryName: "KENYA",
    currency: "KES",
    symbol: "KSh",
    rateToUsd: 129,
    dutyRate: 0,
    vatRate: 0.16,
    shippingBase: 12,
    shippingPerKg: 0.08,
    etaDays: "2-4 DAYS",
    isEac: true,
  },
  {
    region: "TZ",
    countryName: "TANZANIA",
    currency: "TZS",
    symbol: "TSh",
    rateToUsd: 2620,
    dutyRate: 0,
    vatRate: 0.18,
    shippingBase: 15,
    shippingPerKg: 0.09,
    etaDays: "3-5 DAYS",
    isEac: true,
  },
  {
    region: "RW",
    countryName: "RWANDA",
    currency: "RWF",
    symbol: "FRw",
    rateToUsd: 1345,
    dutyRate: 0,
    vatRate: 0.18,
    shippingBase: 13,
    shippingPerKg: 0.08,
    etaDays: "2-4 DAYS",
    isEac: true,
  },
  {
    // DR Congo — EAC member on a transitional customs-integration roadmap
    // (not yet inside the free-trade-area mechanics). Corridor duty is
    // estimated, never zero, and quoted transparently at checkout.
    region: "CD",
    countryName: "DR CONGO",
    currency: "CDF",
    symbol: "FC",
    rateToUsd: 2850,
    dutyRate: 0.05,
    vatRate: 0.16,
    shippingBase: 28,
    shippingPerKg: 0.12,
    etaDays: "4-7 DAYS",
    isEac: true,
  },
  {
    region: "INTL",
    countryName: "INTERNATIONAL",
    currency: "USD",
    symbol: "$",
    rateToUsd: 1,
    dutyRate: 0.075,
    vatRate: 0,
    shippingBase: 45,
    shippingPerKg: 0.35,
    etaDays: "10-21 DAYS",
    isEac: false,
  },
];

async function main() {
  console.log("Seeding catalog…");
  for (const p of products) {
    const { slug, image, ...erpFields } = p;
    await db.product.upsert({
      where: { productId: p.productId },
      update: { ...p, image: `/products/${p.slug}.png` },
      create: { ...p, image: `/products/${p.slug}.png` },
    });
  }
  console.log(`  products: ${products.length}`);

  for (const r of regions) {
    await db.regionConfig.upsert({
      where: { region: r.region },
      update: r,
      create: r,
    });
  }
  console.log(`  regions: ${regions.length}`);

  // Refresh merchant identity on existing rows
  await db.product.updateMany({
    data: { merchantId: "MCH-MRD-001", merchantName: "Meridian Supply Co." },
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
