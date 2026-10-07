import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/request-origin";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { newsletterSubscribeSchema } from "@/lib/public-write-schema";
import {
  consumePublicWriteBudget,
  PUBLIC_WRITE_RETRY_AFTER_SECONDS,
} from "@/lib/public-write-rate-limit";

/**
 * POST /api/subscribe
 * Footer newsletter signup — the store's pre-sale lead list.
 * Deduplicated per email (unique index): a repeat signup is a no-op that
 * still resolves success, so the footer UI can flip to the confirmed state
 * either way.
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
    "subscribe",
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

  const parsed = newsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "A valid email address is required" },
      { status: 400 }
    );
  }

  try {
    const { email } = parsed.data;

    const existing = await db.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({ success: true, already: true });
    }

    await db.newsletterSubscriber.create({ data: { email } });

    return NextResponse.json({ success: true, already: false }, { status: 201 });
  } catch (error) {
    console.error("POST /api/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
