import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  adminCanCancel,
  isOrderStatus,
  nextStatus,
} from "@/lib/order-workflow";
import {
  orderStatusUpdateEmail,
  sendEmail,
} from "@/lib/mail";
import { isSameOriginRequest } from "@/lib/request-origin";
import { dispatchSchema } from "@/lib/admin-order-payment-schema";
import { paymentStatusLabel, shouldWarnBeforeDispatch } from "@/lib/order-payment";

export const dynamic = "force-dynamic";

type ActionBody = {
  action?: "advance" | "cancel" | "note" | "dispatch";
  note?: unknown;
  trackingNumber?: unknown;
};

function parseEmail(customerInfo: string): string | null {
  const match = customerInfo.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/);
  return match ? match[0] : null;
}

/**
 * GET /api/admin/orders/[orderNumber]
 * Full owner view of one order: customer block, line items, event history,
 * and the stock movements linked to it (cancellation restocks).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage orders." },
        { status: 401 }
      );
    }

    const { orderNumber } = await context.params;
    const order = await db.orderProcessing.findUnique({
      where: { orderNumber },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        // The owner's private payment ledger. This handler is admin-only; the
        // PUBLIC tracking handler is a separate route and must never include it.
        payments: { orderBy: { receivedAt: "desc" } },
      },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const productIds = Array.from(new Set(order.lineItems.map((li) => li.productId)));
    // Recent ledger activity for the products on this order — gives the
    // owner the stock context around the order (cancellation restocks land
    // here with the order number in the note).
    const movements = await db.stockMovement.findMany({
      where: { productId: { in: productIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      { success: true, order, movements },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders/[orderNumber] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load the order." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/orders/[orderNumber]  { action, note? }
 * action=advance — walk the order one step: new_order → processing →
 *                  shipped → delivered. Writes the OrderEvent and emails
 *                  the customer when their address is on the order.
 * action=cancel  — cancel from new_order/processing; restocks every line
 *                  inside the transaction with StockMovement rows.
 * action=note    — attach a customer-visible note (tracking events are
 *                  public, so the admin UI says so in plain words).
 */
export async function PATCH(
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

    let body: ActionBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const action = body.action;
    if (
      action !== "advance" &&
      action !== "cancel" &&
      action !== "note" &&
      action !== "dispatch"
    ) {
      return NextResponse.json(
        { success: false, error: "Unknown action." },
        { status: 400 }
      );
    }
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : null;

    const { orderNumber } = await context.params;
    const order = await db.orderProcessing.findUnique({
      where: { orderNumber },
      include: { lineItems: true },
    });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    // action === "dispatch" — record the REAL waybill and mark shipped.
    // Before this existed, the tracking number the customer saw was the
    // placeholder generated at checkout (TRK-<order>-<region>) and there was no
    // surface anywhere in the admin that could replace it.
    if (action === "dispatch") {
      const parsed = dispatchSchema.safeParse({
        trackingNumber: body.trackingNumber,
        note,
      });
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Enter the operator's waybill or tracking number.",
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }
      if (order.status === "cancelled" || order.status === "returned") {
        return NextResponse.json(
          { success: false, error: "This order is closed and cannot be dispatched." },
          { status: 409 }
        );
      }
      if (order.status === "delivered") {
        return NextResponse.json(
          { success: false, error: "This order is already delivered." },
          { status: 409 }
        );
      }

      const { trackingNumber, note: dispatchNote } = parsed.data;
      const target = order.status === "shipped" ? "shipped" : "shipped";

      await db.$transaction(async (tx) => {
        await tx.orderProcessing.update({
          where: { orderNumber },
          data: {
            trackingNumber,
            trackingIsPlaceholder: false,
            dispatchedAt: order.dispatchedAt ?? new Date(),
            status: target,
          },
        });
        await tx.orderEvent.create({
          data: {
            orderNumber,
            fromStatus: order.status,
            toStatus: target,
            note:
              dispatchNote ??
              `Dispatched — tracking number ${trackingNumber}.`,
          },
        });
      });

      const customerEmail = parseEmail(order.customerInfo);
      if (customerEmail) {
        await sendEmail(
          customerEmail,
          orderStatusUpdateEmail(
            orderNumber,
            target,
            dispatchNote ?? `Dispatched — tracking number ${trackingNumber}.`
          )
        );
      }

      return NextResponse.json(
        {
          success: true,
          order: { orderNumber, status: target, trackingNumber },
          // Recorded for the owner, never shown to the customer.
          paymentWarning: shouldWarnBeforeDispatch(order.paymentStatus)
            ? `This order is ${paymentStatusLabel(order.paymentStatus).toLowerCase()} — confirm payment was received.`
            : undefined,
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "advance") {
      const target = nextStatus(order.status);
      if (!target) {
        return NextResponse.json(
          {
            success: false,
            error:
              order.status === "cancelled" || order.status === "returned"
                ? "This order is closed and can no longer advance."
                : "This order is already delivered.",
          },
          { status: 409 }
        );
      }

      await db.$transaction(async (tx) => {
        await tx.orderProcessing.update({
          where: { orderNumber, status: order.status },
          data: { status: target },
        });
        await tx.orderEvent.create({
          data: {
            orderNumber,
            fromStatus: order.status,
            toStatus: target,
            note: note ?? `Status advanced to ${target.replaceAll("_", " ")} by the warehouse.`,
          },
        });
      });

      const customerEmail = parseEmail(order.customerInfo);
      if (customerEmail) {
        await sendEmail(customerEmail, orderStatusUpdateEmail(orderNumber, target, note));
      }

      return NextResponse.json(
        {
          success: true,
          order: { orderNumber, status: target },
          // Not a block: dispatch decisions belong to the owner (a trusted
          // repeat buyer, or COD which pays on arrival). Surfaced so the UI can
          // say it, and so the honest state of the order travels with the reply.
          paymentWarning: shouldWarnBeforeDispatch(order.paymentStatus)
            ? `This order is ${paymentStatusLabel(order.paymentStatus).toLowerCase()} — confirm payment was received.`
            : undefined,
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (action === "cancel") {
      if (!adminCanCancel(order.status)) {
        return NextResponse.json(
          {
            success: false,
            error:
              order.status === "cancelled"
                ? "This order is already cancelled."
                : "Shipped or delivered orders cannot be cancelled.",
          },
          { status: 409 }
        );
      }

      await db.$transaction(async (tx) => {
        await tx.orderProcessing.update({
          where: { orderNumber, status: order.status },
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
              createdBy: "ADMIN",
            },
          });
        }
        await tx.orderEvent.create({
          data: {
            orderNumber,
            fromStatus: order.status,
            toStatus: "cancelled",
            note: note ?? "Order cancelled by the store — items returned to stock.",
          },
        });
      });

      const customerEmail = parseEmail(order.customerInfo);
      if (customerEmail) {
        await sendEmail(
          customerEmail,
          orderStatusUpdateEmail(orderNumber, "cancelled", note ?? "Your order was cancelled and any payment arrangements will be handled by our team.")
        );
      }

      return NextResponse.json(
        { success: true, order: { orderNumber, status: "cancelled" } },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    // action === "note"
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Write a note first." },
        { status: 400 }
      );
    }
    await db.orderEvent.create({
      data: {
        orderNumber,
        fromStatus: order.status,
        toStatus: order.status,
        note,
      },
    });
    return NextResponse.json(
      { success: true, order: { orderNumber, status: order.status } },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (isOrderStatusGuardError(error)) {
      return NextResponse.json(
        { success: false, error: "The order changed while you were working — reload and try again." },
        { status: 409 }
      );
    }
    console.error("PATCH /api/admin/orders/[orderNumber] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update the order." },
      { status: 500 }
    );
  }
}

/**
 * Prisma surfaces the failed `where: { orderNumber, status }` guard as P2002
 * (unique-constraint shape) or P2025 depending on the engine path — duck-type
 * both codes rather than trusting instanceof (R22 lesson).
 */
function isOrderStatusGuardError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown }).code
      : undefined;
  return code === "P2002" || code === "P2025";
}
