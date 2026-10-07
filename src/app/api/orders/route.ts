import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshFxRatesIfStale } from "@/lib/fx";
import {
  newOrderAlertEmail,
  orderConfirmationEmail,
  ownerAlertAddress,
  sendAll,
} from "@/lib/mail";
import { leviesFor } from "@/lib/levies";
import { getCustomerSession } from "@/lib/admin-auth";
import { prismaErrorCode } from "@/lib/prisma-error";

type CartLine = { productId: string; variantLabel?: string; qty: number };

class StockConflictError extends Error {}

/**
 * GET /api/orders?orderNumber=DS100001
 * Order tracking lookup — returns order + line items + status events.
 *
 * Round 26 PII repair: this endpoint is PUBLIC and order numbers are
 * sequential (trivially enumerable), so the response is reduced to a
 * strict whitelist of shipment fields. customerInfo (name | phone | email
 * | address), customerName, customerId, notes and account linkage are no
 * longer readable by anonymous callers. The tracking UI never displayed
 * these — the leak was response-only.
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

    const publicOrder = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      orderDate: order.orderDate,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      currency: order.currency,
      fxRate: order.fxRate,
      region: order.region,
      destination: order.destination,
      // Round 27: the dispatch carrier's NAME is shipment metadata, not
      // personal data, so it may join the whitelist. receiverName/Phone are
      // a third party's PII — they stay reachable only through the buyer's
      // own session (/account/orders) and the admin detail page, never here.
      operatorName: order.operatorName,
      freightSource: order.freightSource,
    };
    return NextResponse.json({
      success: true,
      order: publicOrder,
      lineItems: order.lineItems.map((li) => ({
        productId: li.productId,
        productName: li.productName,
        brand: li.brand,
        variant: li.variant,
        qty: li.qty,
        unitSellingPrice: li.unitSellingPrice,
        lineTotal: li.lineTotal,
      })),
      events: order.events.map((ev) => ({
        id: ev.id,
        orderNumber: ev.orderNumber,
        fromStatus: ev.fromStatus,
        toStatus: ev.toStatus,
        note: ev.note,
        createdAt: ev.createdAt,
      })),
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
    const customerSession = await getCustomerSession();
    const body = await req.json();
    const {
      customerName,
      contact, // phone
      email,
      address,
      city,
      country, // region code: UG | KE | TZ | RW | CD | INTL
      paymentMethod,
      notes,
      receiverName, // Round 27 — person collecting at the destination bus terminal
      receiverPhone,
      operatorId, // BusOperator id — required when the region is served by operators
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
      receiverName?: string;
      receiverPhone?: string;
      operatorId?: string;
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

    // Convert with the freshest stored rate (refreshed upstream, TTL-gated).
    await refreshFxRatesIfStale();
    const regionCfg = await db.regionConfig.findUnique({ where: { region: country } });
    if (!regionCfg) {
      return NextResponse.json(
        { success: false, error: "Unsupported destination" },
        { status: 400 }
      );
    }

    // ---------- bus cargo operator (Round 27) ----------
    // Regions with an active operator fleet MUST be shipped via one of them —
    // freight is quoted from the chosen operator's tariff, the consignment is
    // booked under that operator's waybill, and a receiver must be named for
    // terminal collection. INTL (and any region whose fleet is deactivated)
    // keeps the standard forwarder math. The operator is resolved SERVER-SIDE
    // from the catalog: the client sends an id, never money.
    const activeOperators = await db.busOperator.findMany({
      where: { regionCode: country, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    let selectedOperator: {
      id: string;
      name: string;
      cargoRatePerKg: number;
      minCharge: number;
      transitDaysMin: number;
      transitDaysMax: number;
    } | null = null;

    if (operatorId !== undefined && operatorId !== null && operatorId !== "") {
      selectedOperator =
        activeOperators.find((o) => o.id === operatorId) ?? null;
      if (!selectedOperator) {
        return NextResponse.json(
          {
            success: false,
            error: `The selected bus operator does not serve ${regionCfg.countryName} — pick one from the list.`,
          },
          { status: 400 }
        );
      }
    } else if (activeOperators.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Select a bus cargo operator for this destination.",
        },
        { status: 400 }
      );
    }

    if (selectedOperator) {
      if (!receiverName?.trim() || !receiverPhone?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Receiver name and phone at the destination bus terminal are required for bus cargo.",
          },
          { status: 400 }
        );
      }
      if (receiverName.trim().length > 80 || receiverPhone.trim().length > 40) {
        return NextResponse.json(
          { success: false, error: "Receiver name or phone is too long." },
          { status: 400 }
        );
      }
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
    // National border levies still charged on top of (zero) duty — mirrors
    // quoteCart() in src/lib/format.ts. Response-only: not persisted to the
    // OrderProcessing table (no levies column); the totalAmount includes them.
    const levyCfg = leviesFor(regionCfg.region);
    const levyLines = levyCfg.map((l) => ({
      code: l.code,
      rate: l.rate,
      amount: subtotal * l.rate,
    }));
    const leviesAmount = levyLines.reduce((s, l) => s + l.amount, 0);
    const leviesInVatBase = levyCfg
      .filter((l) => l.inVatBase)
      .reduce((s, l) => s + subtotal * l.rate, 0);
    const dutyAmount = subtotal * regionCfg.dutyRate;
    const vatAmount = (subtotal + dutyAmount + leviesInVatBase) * regionCfg.vatRate;
    // Freight: bus operator tariff (per-kg with a per-consignment minimum)
    // when an operator is chosen; the standard region math otherwise.
    const shippingAmount = selectedOperator
      ? Math.max(
          selectedOperator.minCharge,
          selectedOperator.cargoRatePerKg * totalWeightKg
        )
      : regionCfg.shippingBase + totalWeightKg * regionCfg.shippingPerKg;
    const totalAmount = subtotal + dutyAmount + leviesAmount + vatAmount + shippingAmount;

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
    // throws, so a failed attempt re-uses the same rolled-back sequence value
    // and the P2002 retry below stays a no-op safety net.
    // NOTE: must stay an arrow function — a hoisted `function` declaration
    // would defeat TS narrowing of regionCfg / paymentMethod from the
    // validation guards above.
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
            receiverName: selectedOperator ? receiverName!.trim() : null,
            receiverPhone: selectedOperator ? receiverPhone!.trim() : null,
            operatorName: selectedOperator ? selectedOperator.name : null,
            operatorRatePerKg: selectedOperator
              ? selectedOperator.cargoRatePerKg
              : null,
            operatorMinCharge: selectedOperator
              ? selectedOperator.minCharge
              : null,
            freightSource: selectedOperator ? "bus_operator" : "standard",
            notes: notes?.trim() || null,
            customerAccountId: customerSession?.user.id ?? null,
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
        // (R22 auditor repair: instanceof failed under the production bundle —
        // see src/lib/prisma-error.ts — so the retry below never fired.)
        const target =
          typeof error === "object" && error !== null
            ? (error as { meta?: { target?: unknown } }).meta?.target
            : undefined;
        const isSequenceConflict =
          prismaErrorCode(error) === "P2002" &&
          Array.isArray(target) &&
          (target.includes("orderNumber") || target.includes("orderId"));
        if (!isSequenceConflict || attempt >= 2) throw error;
      }
    }

    // ---------- emails (Round 26) ----------
    // Awaited but individually failure-isolated: a dead mail provider adds
    // at most ~1s and never fails a placed order. Without RESEND_API_KEY
    // both sends are logged to the server console instead (log-only mode).
    const emailPayload = {
      orderNumber: created.orderNumber,
      trackingNumber: created.trackingNumber,
      customerName: customerNameValue,
      totalAmount: created.totalAmount,
      paymentMethod: created.paymentMethod,
      destination: created.destination,
      items: resolved.map((l) => ({
        productName: l.productName,
        variant: l.variant,
        qty: l.qty,
        lineTotal: Math.round(l.lineTotal * 100) / 100,
      })),
    };
    const ownerAddress = ownerAlertAddress();
    await sendAll(
      ...(email
        ? [{ to: email.trim(), template: orderConfirmationEmail(emailPayload, regionCfg) }]
        : []),
      ...(ownerAddress ? [{ to: ownerAddress, template: newOrderAlertEmail(emailPayload) }] : [])
    );

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
          leviesAmount: Math.round(leviesAmount * 100) / 100,
          levyLines: levyLines.map((l) => ({
            ...l,
            amount: Math.round(l.amount * 100) / 100,
          })),
          vatAmount: created.vatAmount,
          shippingAmount: created.shippingAmount,
          totalWeightKg: created.totalWeightKg,
          paymentMethod: created.paymentMethod,
          // Effective transit window: the operator's own tariff window when a
          // bus operator carries the consignment, the region's structured
          // window next, the seeded string last.
          etaDays: selectedOperator
            ? `${selectedOperator.transitDaysMin}-${selectedOperator.transitDaysMax} DAYS`
            : regionCfg.etaDays,
          operatorName: created.operatorName,
          freightSource: created.freightSource,
          receiverName: created.receiverName,
          receiverPhone: created.receiverPhone,
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
