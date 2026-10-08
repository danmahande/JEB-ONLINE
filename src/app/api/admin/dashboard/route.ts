import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard
 * The owner's landing surface.
 *
 * `/admin` used to redirect straight to /admin/products, so the first thing the
 * owner saw was inventory while orders — the work that actually has a deadline —
 * sat one click away behind a status chip. This endpoint supplies the numbers
 * for the room they should start in: what needs action, what is unpaid, what is
 * about to run out.
 */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to view the dashboard." },
        { status: 401 }
      );
    }

    const [
      statusCounts,
      unpaidCount,
      partPaidCount,
      paidCount,
      unpaidValue,
      stockRisk,
      recentOrders,
    ] = await Promise.all([
      db.orderProcessing.groupBy({ by: ["status"], _count: { _all: true } }),
      db.orderProcessing.count({ where: { paymentStatus: "unpaid" } }),
      db.orderProcessing.count({ where: { paymentStatus: "partial" } }),
      db.orderProcessing.count({ where: { paymentStatus: "paid" } }),
      // Money the store is still owed on orders that are not cancelled —
      // the figure the owner would otherwise reconcile by hand.
      db.orderProcessing.aggregate({
        where: {
          paymentStatus: { in: ["unpaid", "partial"] },
          status: { notIn: ["cancelled", "returned"] },
        },
        _sum: { totalAmount: true, paidAmountUsd: true },
      }),
      db.product.findMany({
        where: { isActive: true },
        select: {
          productId: true,
          productLabel: true,
          slug: true,
          currentStock: true,
          minStock: true,
          unit: true,
        },
        orderBy: { currentStock: "asc" },
        take: 200,
      }),
      db.orderProcessing.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          orderNumber: true,
          customerName: true,
          totalAmount: true,
          currency: true,
          region: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          trackingIsPlaceholder: true,
          _count: { select: { lineItems: true } },
        },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row._count._all;

    // Stock risk is computed here rather than fetched, so "at or below minimum"
    // and "sold out" mean the same thing on this page as they do on Products.
    const lowStock = stockRisk.filter(
      (p) => p.currentStock > 0 && p.currentStock <= p.minStock
    );
    const soldOut = stockRisk.filter((p) => p.currentStock <= 0);

    const owed =
      (unpaidValue._sum.totalAmount ?? 0) - (unpaidValue._sum.paidAmountUsd ?? 0);

    return NextResponse.json(
      {
        success: true,
        orders: {
          newOrder: counts.new_order ?? 0,
          processing: counts.processing ?? 0,
          shipped: counts.shipped ?? 0,
          delivered: counts.delivered ?? 0,
          cancelled: counts.cancelled ?? 0,
          total: Object.values(counts).reduce((sum, n) => sum + n, 0),
        },
        payment: {
          unpaid: unpaidCount,
          partPaid: partPaidCount,
          paid: paidCount,
          owedUsd: Math.max(0, Math.round(owed * 100) / 100),
        },
        stock: {
          soldOutCount: soldOut.length,
          lowStockCount: lowStock.length,
          worst: [...soldOut, ...lowStock].slice(0, 6),
        },
        recentOrders,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load the dashboard." },
      { status: 500 }
    );
  }
}
