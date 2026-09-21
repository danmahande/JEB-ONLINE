import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products
 * Product catalog feed.
 * Field names mirror the upstream ERP's Product model; adds storefront fields (slug, image, variants).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { isActive: true };
    if (category && category !== "ALL") where.category = category;

    const products = await db.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { productLabel: "asc" }],
    });

    const parsed = products.map((p) => ({
      // ---- upstream ERP fields ----
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
      minStock: p.minStock,
      unitCost: p.unitCost,
      unitSellingPrice: p.unitSellingPrice,
      currentStock: p.currentStock,
      costingMethod: p.costingMethod,
      isActive: p.isActive,
      // ---- storefront extensions ----
      slug: p.slug,
      image: p.image,
      hsCode: p.hsCode,
      originCountry: p.originCountry,
      variants: JSON.parse(p.variants || "[]"),
    }));

    return NextResponse.json(
      { success: true, count: parsed.length, products: parsed },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load products" },
      { status: 500 }
    );
  }
}
