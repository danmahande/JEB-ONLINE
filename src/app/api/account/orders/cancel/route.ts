import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { customerCanCancel } from "@/lib/order-workflow";
import { isSameOriginRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/orders/cancel  { orderNumber }
 * Customer self-service cancellation (Round 26).
 *
 * Rules:
 *  - session required; the order must belong to the session's account
 *  - only `new_order` orders are cancellable by the customer (untouched
 *    orders only — once the warehouse starts processing, contact us)
 *  - cancellation restocks every line item inside the same transaction and
 *    writes matching StockMovement rows (reason "cancellation") so the
 *    stock ledger stays truthful
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Request origin could not be verified." },
      { status: 403 }
    );
  }

  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Sign in to cancel an order." },
        { status: 401 }
      );
    }

    let body: { orderNumber?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const orderNumber =
      typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "orderNumber is required." },
        { status: 400 }
      );
    }

    const order = await db.orderProcessing.findUnique({
      where: { orderNumber },
      include: { lineItems: true },
    });
    if (!order || order.customerAccountId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }
    if (!customerCanCancel(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error:
            order.status === "cancelled"
              ? "This order is already cancelled."
              : "This order is already being prepared — contact us to cancel it.",
        },
        { status: 409 }
      );
    }

    const cancelled = await db.$transaction(async (tx) => {
      const updated = await tx.orderProcessing.update({
        where: {
          orderNumber,
          // guard re-check inside the transaction: a concurrent admin
          // advancement must not be silently overwritten
          status: order.status,
        },
        data: { status: "cancelled" },
      });

      for (const li of order.lineItems) {
        const product = await tx.product.update({
          where: { productId: li.productId },
          data: { currentStock: { increment: li.qty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: li.productId,
            delta: li.qty,
            resultingStock: product.currentStock,
            reason: "cancellation",
            note: `Restocked from cancelled order ${orderNumber}`,
            createdBy: "CUSTOMER",
          },
        });
      }

      await tx.orderEvent.create({
        data: {
          orderNumber,
          fromStatus: order.status,
          toStatus: "cancelled",
          note: "Order cancelled by the customer — items returned to stock.",
        },
      });

      return updated;
    });

    return NextResponse.json(
      {
        success: true,
        order: { orderNumber: cancelled.orderNumber, status: cancelled.status },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("POST /api/account/orders/cancel error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel the order. Please try again." },
      { status: 500 }
    );
  }
}
