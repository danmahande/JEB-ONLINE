import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/request-origin";
import { paymentRecordSchema } from "@/lib/admin-order-payment-schema";
import { derivePaymentStatus } from "@/lib/order-payment";
import { prismaErrorCode } from "@/lib/prisma-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[orderNumber]/payments
 * Records money actually received against an order.
 *
 * This is the owner's private ledger: PaymentRecord is deliberately not an
 * OrderEvent, because order events render on the customer's public tracking
 * page. OrderProcessing's derived fields (paymentStatus, paidAmountUsd, paidAt)
 * are recomputed from the rows inside the same transaction, so they can never
 * drift from the ledger.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
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
        { success: false, error: "Sign in to manage orders." },
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

    const parsed = paymentRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Check the amount, method and reference and try again.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { orderNumber } = await context.params;
    const order = await db.orderProcessing.findUnique({
      where: { orderNumber },
      select: { orderNumber: true, totalAmount: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const { method, amountUsd, reference, note } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      await tx.paymentRecord.create({
        data: {
          orderNumber,
          method,
          amountUsd,
          reference: reference ?? null,
          note: note ?? null,
        },
      });

      // Recompute from the ledger rather than incrementing, so a retry or a
      // manual database edit can never leave the derived fields wrong.
      const paid = await tx.paymentRecord.aggregate({
        where: { orderNumber },
        _sum: { amountUsd: true },
      });
      const paidAmountUsd = paid._sum.amountUsd ?? 0;
      const paymentStatus = derivePaymentStatus(order.totalAmount, paidAmountUsd);

      const updated = await tx.orderProcessing.update({
        where: { orderNumber },
        data: {
          paidAmountUsd,
          paymentStatus,
          paidAt: paymentStatus === "paid" ? new Date() : null,
        },
        select: { paymentStatus: true, paidAmountUsd: true, paidAt: true },
      });

      return updated;
    });

    return NextResponse.json(
      { success: true, payment: result },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    // The order vanished between the read and the write.
    if (prismaErrorCode(error) === "P2003" || prismaErrorCode(error) === "P2025") {
      return NextResponse.json(
        { success: false, error: "That order no longer exists — reload and try again." },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/orders/[orderNumber]/payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record the payment." },
      { status: 500 }
    );
  }
}
