import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/subscribe
 * Footer newsletter signup — the store's pre-sale lead list.
 * Deduplicated per email (unique index): a repeat signup is a no-op that
 * still resolves success, so the footer UI can flip to the confirmed state
 * either way. Same shape and gates as /api/restock-notify.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    const emailValue = email?.trim().toLowerCase();
    // Same shape the browser enforces via type="email" — this is the only
    // gate for non-browser clients.
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const existing = await db.newsletterSubscriber.findUnique({
      where: { email: emailValue },
    });

    if (existing) {
      return NextResponse.json({ success: true, already: true });
    }

    await db.newsletterSubscriber.create({
      data: { email: emailValue },
    });

    return NextResponse.json({ success: true, already: false }, { status: 201 });
  } catch (error) {
    console.error("POST /api/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}
