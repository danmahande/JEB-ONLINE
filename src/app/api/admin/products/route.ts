import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { adminProductCreateSchema } from "@/lib/admin-products-schema";
import { db } from "@/lib/db";
import { parseProductVariants } from "@/lib/variants";
import { isPrismaUniqueConstraintError } from "@/lib/prisma-error";
import { isSameOriginRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSlug(productLabel: string, productId: string): string {
  const label = slugPart(productLabel).slice(0, 80);
  const id = slugPart(productId).slice(0, 32);
  return [label, id].filter(Boolean).join("-").slice(0, 120);
}

function invalidJsonResponse() {
  return NextResponse.json(
    { success: false, error: "Request body must be valid JSON." },
    { status: 400 }
  );
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage products." },
        { status: 401 }
      );
    }

    const products = await db.product.findMany({
      orderBy: [{ isActive: "desc" }, { category: "asc" }, { productLabel: "asc" }],
    });

    const serialized = products.map((product) => ({
      ...product,
      variants: parseProductVariants(product.variants),
    }));

    return NextResponse.json(
      { success: true, count: serialized.length, products: serialized },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load products." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Request origin could not be verified." },
      { status: 403 }
    );
  }

  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage products." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return invalidJsonResponse();
    }

    const parsed = adminProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Check the product details and try again.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { openingStock, variants, productLabel, productId, ...fields } = parsed.data;
    const product = await db.product.create({
      data: {
        ...fields,
        productId,
        productLabel,
        slug: createSlug(productLabel, productId),
        currentStock: openingStock,
        variants: JSON.stringify(variants),
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: { ...product, variants },
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: "That product ID or generated catalog URL is already in use.",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product." },
      { status: 500 }
    );
  }
}
