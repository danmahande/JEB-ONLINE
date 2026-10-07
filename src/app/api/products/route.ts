import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/products
 * Product catalog feed.
 * Field names mirror the upstream ERP's Product model; adds storefront fields (slug, image, variants).
 *
 * Round 26 pagination story: `page` + `pageSize` (max 100) slice the feed
 * and return total/totalPages. WITHOUT a `page` param the feed returns the
 * full active catalog exactly as before — the storefront's client-side
 * search/filter stays untouched, and growth has a server-side path ready.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { isActive: true };
    if (category && category !== "ALL") where.category = category;

    const pageParam = Number(searchParams.get("page"));
    const hasPaging = Number.isFinite(pageParam) && pageParam > 0;
    const page = hasPaging ? Math.floor(pageParam) : 1;
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 60)
    );

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { productLabel: "asc" }],
        ...(hasPaging ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
    ]);

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
      {
        success: true,
        count: parsed.length,
        products: parsed,
        total,
        ...(hasPaging
          ? { page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
          : {}),
      },
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
