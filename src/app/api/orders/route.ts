import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { db } from "@/lib/db";

type CartLine = { productId: string; variantLabel?: string; qty: number };

class StockConflictError extends Error {}

/**
 * GET /api/orders?orderNumber=DS100001
 * Order tracking lookup — returns order + line items + status events.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber")?.trim();
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "orderNumber is required" },
        { status: 400 }
      );
    }

    const order = await db.orderProcessing.findFirst({
      where: {
        OR: [{ orderNumber }, { trackingNumber: orderNumber }],
      },
      include: { lineItems: true, events: { orderBy: { createdAt: "asc" as const } } },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const { lineItems, events, ...o } = order;
    return NextResponse.json({
      success: true,
      order: o,
      lineItems,
      events,
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to look up order" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Creates an order in upstream-ERP-compatible shape:
 *  - OrderProcessing (orderNumber "DS100001" convention, trackingNumber)
 *  - OrderLineItem rows
 *  - Customer upsert (by phone contact, per ERP behavior)
 *  - Stock decrement inside a transaction
 * Pricing is recomputed server-side from the catalog — client cart is never trusted.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      contact, // phone
      email,
      address,
      city,
      country, // region code: UG | KE | TZ | RW | INTL
      paymentMethod,
      notes,
      cart, // CartLine[]
    } = body as {
      customerName?: string;
      contact?: string;
      email?: string;
      address?: string;
      city?: string;
      country?: string;
      paymentMethod?: string;
      notes?: string;
      cart?: CartLine[];
    };

    // ---------- validation ----------
    if (!customerName?.trim() || !contact?.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name and phone contact are required" },
        { status: 400 }
      );
    }
    if (!country) {
      return NextResponse.json(
        { success: false, error: "Destination country is required" },
        { status: 400 }
      );
    }
    if (!paymentMethod?.trim()) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    const regionCfg = await db.regionConfig.findUnique({ where: { region: country } });
    if (!regionCfg) {
      return NextResponse.json(
        { success: false, error: "Unsupported destination" },
        { status: 400 }
      );
    }

    // ---------- server-side pricing ----------
    type Resolved = {
      productId: string;
      productName: string;
      brand: string | null;
      variant: string;
      qty: number;
      unitSellingPrice: number;
      lineTotal: number;
      weightKg: number;
      unitWeightKg: number;
      currentStock: number;
    };

    const resolved: Resolved[] = [];
    const insufficient: string[] = [];

    for (const line of cart) {
      if (!line?.productId || !Number.isFinite(line.qty) || line.qty <= 0) continue;
      const qty = Math.floor(line.qty);
      const p = await db.product.findUnique({ where: { productId: line.productId } });
      if (!p || !p.isActive) {
        insufficient.push(line.productId + " (unavailable)");
        continue;
      }
      let variants: { label: string; priceDelta: number; weightKg: number }[] = [];
      try {
        variants = JSON.parse(p.variants || "[]");
      } catch {}
      const v =
        variants.find((x) => x.label === line.variantLabel) ?? variants[0] ?? {
          label: p.variant || p.unit,
          priceDelta: 0,
          weightKg: parseFloat(p.weight || "0") || 0,
        };

      const unitSellingPrice = p.unitSellingPrice + (v.priceDelta || 0);
      if (p.currentStock < qty) {
        insufficient.push(`${p.productLabel} (${p.currentStock} ${p.unit} left)`);
        continue;
      }
      resolved.push({
        productId: p.productId,
        productName: p.productLabel,
        brand: p.brand,
        variant: v.label,
        qty,
        unitSellingPrice,
        lineTotal: unitSellingPrice * qty,
        weightKg: (v.weightKg || 0) * qty,
        unitWeightKg: v.weightKg || 0,
        currentStock: p.currentStock,
      });
    }

    if (insufficient.length > 0) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock: ${insufficient.join(", ")}` },
        { status: 409 }
      );
    }
    if (resolved.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid line items in cart" },
        { status: 400 }
      );
    }

    const subtotal = resolved.reduce((s, l) => s + l.lineTotal, 0);
    const totalWeightKg = resolved.reduce((s, l) => s + l.weightKg, 0);
    const dutyAmount = subtotal * regionCfg.dutyRate;
    const vatAmount = (subtotal + dutyAmount) * regionCfg.vatRate;
    const shippingAmount =
      regionCfg.shippingBase + totalWeightKg * regionCfg.shippingPerKg;
    const totalAmount = subtotal + dutyAmount + vatAmount + shippingAmount;

    const customerNameValue = customerName.trim();
    const contactValue = contact.trim();
    const customerInfo = [
      customerNameValue,
      contactValue,
      email?.trim() || null,
      [address?.trim(), city?.trim()].filter(Boolean).join(", "),
      regionCfg.countryName,
    ]
      .filter(Boolean)
      .join(" | ");

// The sequence is generated atomically inside the transaction via the
// Counter model — $transaction rolls back the increment if any later step
// throws, so gaps only appear on committed conflicts (acceptable for order
// numbers) and a retry re-uses the same rolled-back sequence value.
const createOrderAttempt = async () => {
  // ---------- transaction: counter → customer → order → lines → stock ----------
  return db.$transaction(async (tx) => {
    const now = new Date();
    const counter = await tx.counter.upsert({
      where: { name: "order_seq" },
      update: { value: { increment: 1 } },
      create: { name: "order_seq", value: 1 },
    });
    const seq = counter.value;
    const orderNumber = `DS${100000 + seq}`;
    const orderId = `ORD-${now.getTime()}-${seq}`;
    const trackingNumber = `TRK-${orderNumber}-${regionCfg.region}`;
        const baseContact = contactValue;
        const existing = await tx.customer.findUnique({
          where: { contact: baseContact },
        });
        let customerId: string;
        if (existing) {
          await tx.customer.update({
            where: { contact: baseContact },
            data: {
              totalOrders: existing.totalOrders + 1,
              totalOrderValue: existing.totalOrderValue + totalAmount,
              address: address?.trim() || existing.address,
              email: email?.trim() || existing.email,
              country: country,
            },
          });
          customerId = existing.customerId;
        } else {
          const cust = await tx.customer.create({
            data: {
              customerId: `CUS-${now.getTime()}`,
              name: customerNameValue,
              contact: baseContact,
              email: email?.trim() || null,
              address: [address?.trim(), city?.trim()].filter(Boolean).join(", ") || null,
              country: country,
              createdBy: "STOREFRONT",
              totalOrders: 1,
              totalOrderValue: totalAmount,
            },
          });
          customerId = cust.customerId;
        }

        const order = await tx.orderProcessing.create({
          data: {
            orderId,
            orderNumber,
            customerId,
            customerName: customerNameValue,
            customerInfo,
            totalAmount: Math.round(totalAmount * 100) / 100,
            paymentMethod,
            status: "new_order",
            trackingNumber,
            createdBy: "STOREFRONT",
            currency: regionCfg.currency,
            fxRate: regionCfg.rateToUsd,
            region: country,
            destination: regionCfg.countryName,
            dutyAmount: Math.round(dutyAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            shippingAmount: Math.round(shippingAmount * 100) / 100,
            totalWeightKg: Math.round(totalWeightKg * 100) / 100,
            notes: notes?.trim() || null,
            lineItems: {
              create: resolved.map((l) => ({
                orderNumber,
                productId: l.productId,
                productName: l.productName,
                brand: l.brand,
                variant: l.variant,
                qty: l.qty,
                unitSellingPrice: l.unitSellingPrice,
                lineTotal: Math.round(l.lineTotal * 100) / 100,
              })),
            },
          },
        });

        for (const l of resolved) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              productId: l.productId,
              isActive: true,
              currentStock: { gte: l.qty },
            },
            data: { currentStock: { decrement: l.qty } },
          });
          if (stockUpdate.count !== 1)
            throw new StockConflictError(`Insufficient stock for ${l.productName}`);
        }

        await tx.orderEvent.create({
          data: {
            orderNumber,
            fromStatus: "",
            toStatus: "new_order",
            note: `Order placed via storefront — destination ${regionCfg.countryName}`,
          },
        });

        return order;
      });
    };

    let created: Awaited<ReturnType<typeof createOrderAttempt>>;
    for (let attempt = 0; ; attempt++) {
      try {
        created = await createOrderAttempt();
        break;
      } catch (error) {
        // orderNumber and orderId are both @unique and both derive from the
        // same sequence — a P2002 on either means another checkout claimed it.
        const isSequenceConflict =
          error instanceof PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          (error.meta.target.includes("orderNumber") ||
            error.meta.target.includes("orderId"));
        if (!isSequenceConflict || attempt >= 2) throw error;
      }
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          orderId: created.orderId,
          orderNumber: created.orderNumber,
          trackingNumber: created.trackingNumber,
          status: created.status,
          totalAmount: created.totalAmount,
          currency: created.currency,
          fxRate: created.fxRate,
          region: created.region,
          destination: created.destination,
          subtotal: Math.round(subtotal * 100) / 100,
          dutyAmount: created.dutyAmount,
          vatAmount: created.vatAmount,
          shippingAmount: created.shippingAmount,
          totalWeightKg: created.totalWeightKg,
          paymentMethod: created.paymentMethod,
          etaDays: regionCfg.etaDays,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StockConflictError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order" },
      { status: 500 }
    );
  }
}
