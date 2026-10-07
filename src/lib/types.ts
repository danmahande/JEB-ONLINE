// Shared storefront types — upstream ERP wire-compatible

export interface ProductVariant {
  label: string;
  priceDelta: number; // USD
  weightKg: number;
}

export interface Product {
  // upstream ERP fields
  id: string;
  productId: string;
  productLabel: string;
  description: string | null;
  brand: string | null;
  variant: string | null;
  category: "GRAINS" | "HARDWARE" | string;
  merchantId: string;
  merchantName: string;
  unit: string;
  weight: string | null;
  unitCost: number;
  unitSellingPrice: number;
  currentStock: number;
  // storefront extensions
  slug: string;
  image: string | null;
  hsCode: string | null;
  originCountry: string;
  variants: ProductVariant[];
}

export interface RegionConfig {
  region: string;
  countryName: string;
  currency: string;
  symbol: string;
  rateToUsd: number;
  dutyRate: number;
  vatRate: number;
  shippingBase: number;
  shippingPerKg: number;
  etaDays: string;
  /** structured transit window (days); null = rely on the etaDays string */
  etaDaysMin: number | null;
  etaDaysMax: number | null;
  isEac: boolean;
}

/** A bus cargo operator serving a region (public checkout shape). */
export interface BusOperatorOption {
  id: string;
  regionCode: string;
  name: string;
  cargoRatePerKg: number;
  minCharge: number;
  transitDaysMin: number;
  transitDaysMax: number;
  bookingNote: string;
}

export interface CartLine {
  productId: string;
  slug: string;
  productLabel: string;
  brand: string | null;
  variantLabel: string;
  unitPriceUsd: number; // base + priceDelta
  weightKg: number;
  qty: number;
  image: string | null;
  maxStock: number;
}

export interface QuoteLevy {
  code: string;
  rate: number;
  amount: number; // USD
}

export interface Quote {
  subtotal: number;
  duty: number;
  /** national border levies that still apply on top of (zero) duty */
  levies: QuoteLevy[];
  leviesTotal: number;
  vat: number;
  shipping: number;
  total: number;
  totalWeightKg: number;
  /** set when a bus cargo operator drives the freight line */
  operatorName: string | null;
}

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  trackingNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  fxRate: number;
  region: string;
  destination: string;
  subtotal: number;
  dutyAmount: number;
  /** national border levies charged at the border (response-only, not persisted) */
  leviesAmount?: number;
  levyLines?: QuoteLevy[];
  vatAmount: number;
  shippingAmount: number;
  totalWeightKg: number;
  paymentMethod: string;
  etaDays: string;
  /** Round 27 — bus cargo snapshot + terminal receiver (echo of the order) */
  operatorName: string | null;
  freightSource: string;
  receiverName: string | null;
  receiverPhone: string | null;
}

export interface TrackedOrder {
  orderId: string;
  orderNumber: string;
  trackingNumber: string | null;
  orderDate: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  currency: string;
  fxRate?: number;
  region?: string;
  destination: string | null;
  /** Round 27 — dispatch carrier shown on the tracking rail (name only, no tariff detail) */
  operatorName?: string | null;
  freightSource?: string;
}

export interface OrderLine {
  productId: string;
  productName: string;
  brand: string | null;
  variant: string | null;
  qty: number;
  unitSellingPrice: number;
  lineTotal: number;
}

export interface OrderEvent {
  id: string;
  orderNumber: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export const ORDER_STAGES = [
  { key: "new_order", label: "ORDER PLACED" },
  { key: "processing", label: "PROCESSING" },
  { key: "shipped", label: "IN TRANSIT" },
  { key: "delivered", label: "DELIVERED" },
] as const;
