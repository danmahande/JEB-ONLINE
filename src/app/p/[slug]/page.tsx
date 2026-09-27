import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { refreshFxRatesIfStale } from "@/lib/fx";
import { SITE_URL } from "@/lib/site";
import type { Product, ProductVariant, RegionConfig } from "@/lib/types";
import ProductView from "./product-view";

// Live stock, live FX — every render is a fresh quote. Prices are never
// cached at the edge: a stale "in stock" page would take orders we can't fill.
export const dynamic = "force-dynamic";

function parseVariants(raw: string): ProductVariant[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getProduct(slug: string): Promise<Product | null> {
  const p = await db.product.findUnique({ where: { slug } });
  if (!p || !p.isActive) return null;
  return {
    id: p.id,
    productId: p.productId,
    productLabel: p.productLabel,
    description: p.description,
    brand: p.brand,
    variant: p.variant,
    category: p.category,
    merchantId: p.merchantId,
    merchantName: p.merchantName,
    unit: p.unit,
    weight: p.weight,
    unitCost: p.unitCost,
    unitSellingPrice: p.unitSellingPrice,
    currentStock: p.currentStock,
    slug: p.slug,
    image: p.image,
    hsCode: p.hsCode,
    originCountry: p.originCountry,
    variants: parseVariants(p.variants),
  };
}

async function getRegions(): Promise<RegionConfig[]> {
  // Same contract as /api/fx: freshest stored rates, refreshed when stale.
  await refreshFxRatesIfStale();
  return db.regionConfig.findMany({ orderBy: { region: "asc" } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found — MERIDIAN SUPPLY" };

  const description =
    product.description?.trim() ||
    `${product.productLabel} — ${product.category.toLowerCase()} from Uganda, shipped across the EAC and worldwide with duties and freight quoted upfront.`;

  return {
    title: `${product.productLabel} — MERIDIAN SUPPLY`,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      title: `${product.productLabel} — MERIDIAN SUPPLY`,
      description,
      type: "website",
      images: product.image ? [{ url: product.image }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const regions = await getRegions();

  // schema.org Product — the shard crawlers and rich results read. Prices are
  // the base USD selling price; region conversion happens client-side.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.productLabel,
    description: product.description || undefined,
    image: product.image ? new URL(product.image, SITE_URL).href : undefined,
    sku: product.productId,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: product.brand || product.merchantName,
    },
    offers: {
      "@type": "Offer",
      url: new URL(`/p/${product.slug}`, SITE_URL).href,
      priceCurrency: "USD",
      price: product.unitSellingPrice.toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.currentStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductView product={product} regions={regions} />
    </>
  );
}
