// Shared storefront types — kwanza-erp wire-compatible

export interface ProductVariant {
  label: string;
  priceDelta: number; // USD
  weightKg: number;
}

export interface Product {
  // kwanza-erp fields
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
  isEac: boolean;
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

export interface Quote {
  subtotal: number;
  duty: number;
  vat: number;
  shipping: number;
  total: number;
  totalWeightKg: number;
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
  vatAmount: number;
  shippingAmount: number;
  totalWeightKg: number;
  paymentMethod: string;
  etaDays: string;
}

export interface TrackedOrder {
  orderId: string;
  orderNumber: string;
  trackingNumber: string | null;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  currency: string;
  fxRate?: number;
  destination: string | null;
  etaDays?: string;
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
