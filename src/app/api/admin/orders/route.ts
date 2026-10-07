import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/order-workflow";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders?status=&page=&pageSize=&q=
 * Owner order list (Round 26) — the missing half of the ERP loop.
 * Paginated, status-filterable, with counts per status for the filter rail.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage orders." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(5, Number(searchParams.get("pageSize")) || 25)
    );

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json(
          { success: false, error: "Unknown status filter." },
          { status: 400 }
        );
      }
      where.status = status;
    }
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { trackingNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerInfo: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, orders] = await Promise.all([
      db.orderProcessing.count({ where }),
      db.orderProcessing.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          orderId: true,
          orderNumber: true,
          orderDate: true,
          createdAt: true,
          customerName: true,
          customerInfo: true,
          totalAmount: true,
          currency: true,
          fxRate: true,
          region: true,
          destination: true,
          paymentMethod: true,
          status: true,
          trackingNumber: true,
          totalWeightKg: true,
          _count: { select: { lineItems: true, events: true } },
        },
      }),
    ]);

    const statusCounts = await db.orderProcessing.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row._count._all;

    return NextResponse.json(
      {
        success: true,
        orders,
        counts,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load orders." },
      { status: 500 }
    );
  }
}
