import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { restockAlertEmail, sendAll } from "@/lib/mail";
import { isSameOriginRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

const ADJUST_REASONS = ["receipt", "adjustment", "damage", "count_correction"] as const;

const adjustSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  delta: z
    .number()
    .int("Stock change must be a whole number")
    .refine((v) => v !== 0, "Stock change cannot be zero")
    .refine((v) => Math.abs(v) <= 100000, "Stock change is too large"),
  reason: z.enum(ADJUST_REASONS),
  note: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/stock?productId=&take=
 * Recent stock-movement ledger entries — the audit trail for every stock
 * change that was not a live sale (receipts, corrections, damages,
 * cancellation restocks).
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage stock." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId")?.trim();
    const take = Math.min(100, Math.max(1, Number(searchParams.get("take")) || 25));

    const movements = await db.stockMovement.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(
      { success: true, movements },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/stock error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load stock movements." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/stock  { productId, delta, reason, note? }
 * The stock-in/adjustment workflow the admin product form deliberately
 * never had (PATCH stock was rejected by design until this ledger existed).
 * Applies the signed delta in a transaction, writes a StockMovement row,
 * and — when a product comes off zero — emails the pending RestockNotify
 * subscribers and marks them notified.
 */
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
        { success: false, error: "Sign in to manage stock." },
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
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      const fieldError = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .find((m): m is string => Boolean(m));
      return NextResponse.json(
        { success: false, error: fieldError ?? "Check the stock details and try again." },
        { status: 400 }
      );
    }
    const { productId, delta, reason, note } = parsed.data;

    const product = await db.product.findUnique({ where: { productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const before = product.currentStock;
    const after = before + delta;
    if (after < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Adjustment would take stock negative (${before} on the shelf).`,
        },
        { status: 409 }
      );
    }

    const movement = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { productId },
        data: { currentStock: after },
      });
      return tx.stockMovement.create({
        data: {
          productId,
          delta,
          resultingStock: updated.currentStock,
          reason,
          note: note || null,
          createdBy: "ADMIN",
        },
      });
    });

    // ---------- restock notifications ----------
    // A receipt that brings a product off zero releases the pending
    // NOTIFY ME queue. Failure-isolated: mail problems never fail the
    // adjustment; rows only advance to `notified` after a resolved send.
    if (before === 0 && after > 0) {
      try {
        const pending = await db.restockNotify.findMany({
          where: { productId, status: "pending" },
          take: 50,
        });
        if (pending.length > 0) {
          await sendAll(
            ...pending.map((row) => ({
              to: row.email,
              template: restockAlertEmail(product.productLabel, product.slug),
            }))
          );
          await db.restockNotify.updateMany({
            where: { id: { in: pending.map((row) => row.id) } },
            data: { status: "notified" },
          });
        }
      } catch (notifyError) {
        console.error("[stock] restock notify failed:", notifyError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        movement,
        product: { productId: product.productId, currentStock: after },
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/stock error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to adjust stock." },
      { status: 500 }
    );
  }
}
