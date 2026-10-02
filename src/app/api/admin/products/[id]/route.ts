import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  adminProductPatchSchema,
  adminProductSnapshotSchema,
} from "@/lib/admin-products-schema";
import { db } from "@/lib/db";
import {
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "@/lib/prisma-error";
import { isSameOriginRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = adminProductPatchSchema.safeParse(body);
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
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { success: false, error: "Provide at least one product field to update." },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const currentVariants: unknown = JSON.parse(existing.variants || "[]");
    const snapshot = adminProductSnapshotSchema.safeParse({
      productId: existing.productId,
      productLabel: existing.productLabel,
      description: existing.description,
      brand: existing.brand,
      variant: existing.variant,
      category: existing.category,
      unit: existing.unit,
      weight: existing.weight,
      minStock: existing.minStock,
      unitCost: existing.unitCost,
      unitSellingPrice: existing.unitSellingPrice,
      image: existing.image,
      hsCode: existing.hsCode,
      originCountry: existing.originCountry,
      variants: currentVariants,
      isActive: existing.isActive,
    });
    if (!snapshot.success) {
      return NextResponse.json(
        {
          success: false,
          error: "This product has invalid stored details. Correct them before saving.",
          fieldErrors: snapshot.error.flatten().fieldErrors,
        },
        { status: 409 }
      );
    }

    const merged = adminProductSnapshotSchema.safeParse({
      ...snapshot.data,
      ...parsed.data,
    });
    if (!merged.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Check the product details and try again.",
          fieldErrors: merged.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { variants, ...fields } = parsed.data;
    const product = await db.product.update({
      where: { id },
      data: {
        ...fields,
        ...(variants === undefined ? {} : { variants: JSON.stringify(variants) }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: {
          ...product,
          variants: variants ?? merged.data.variants,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, error: "That product ID is already in use." },
        { status: 409 }
      );
    }
    if (isPrismaRecordNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    console.error("PATCH /api/admin/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product." },
      { status: 500 }
    );
  }
}
