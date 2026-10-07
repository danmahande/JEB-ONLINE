import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/request-origin";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { restockNotifySchema } from "@/lib/public-write-schema";
import {
  consumePublicWriteBudget,
  PUBLIC_WRITE_RETRY_AFTER_SECONDS,
} from "@/lib/public-write-rate-limit";

/**
 * POST /api/restock-notify
 * Persists a "NOTIFY ME" restock alert raised on a sold-out catalog tile.
 * Deduplicated per product + email (unique index) — a repeat signup is a
 * no-op that still resolves success, so the tile UI can flip to the
 * confirmed state either way.
 *
 * This endpoint previously accepted unlimited anonymous writes. It now checks
 * same-origin, validates through a schema, and is throttled per caller.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Request origin could not be verified." },
      { status: 403 }
    );
  }

  const throttle = await consumePublicWriteBudget(
    db,
    "restock-notify",
    clientIpFromHeaders(req.headers),
    new Date()
  );
  if (throttle.limited) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(PUBLIC_WRITE_RETRY_AFTER_SECONDS) },
      }
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

  const parsed = restockNotifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "A valid product and email address are required" },
      { status: 400 }
    );
  }

  try {
    const { productId, email } = parsed.data;

    const product = await db.product.findUnique({ where: { productId } });
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Unknown product" },
        { status: 404 }
      );
    }

    const existing = await db.restockNotify.findUnique({
      where: { productId_email: { productId, email } },
    });

    if (existing) {
      // Still pending and the customer asked again — keep the earliest
      // createdAt (the true queue position), just confirm membership.
      return NextResponse.json({ success: true, already: true });
    }

    await db.restockNotify.create({ data: { productId, email } });

    return NextResponse.json({ success: true, already: false }, { status: 201 });
  } catch (error) {
    console.error("POST /api/restock-notify error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save restock alert" },
      { status: 500 }
    );
  }
}
