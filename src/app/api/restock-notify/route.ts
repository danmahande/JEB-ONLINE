import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/restock-notify
 * Persists a "NOTIFY ME" restock alert raised on a sold-out catalog tile.
 * Deduplicated per product + email (unique index) — a repeat signup is a
 * no-op that still resolves success, so the tile UI can flip to the
 * confirmed state either way.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, email } = body as { productId?: string; email?: string };

    if (!productId?.trim()) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }
    const emailValue = email?.trim().toLowerCase();
    // Same shape the browser enforces via type="email" — this is the only
    // gate for non-browser clients.
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({ where: { productId } });
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Unknown product" },
        { status: 404 }
      );
    }

    const existing = await db.restockNotify.findUnique({
      where: { productId_email: { productId, email: emailValue } },
    });

    if (existing) {
      // Still pending and the customer asked again — keep the earliest
      // createdAt (the true queue position), just confirm membership.
      return NextResponse.json({ success: true, already: true });
    }

    await db.restockNotify.create({
      data: { productId, email: emailValue },
    });

    return NextResponse.json({ success: true, already: false }, { status: 201 });
  } catch (error) {
    console.error("POST /api/restock-notify error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save restock alert" },
      { status: 500 }
    );
  }
}
