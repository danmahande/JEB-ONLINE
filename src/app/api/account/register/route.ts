import { NextRequest, NextResponse } from "next/server";
import { customerAccountRegistrationSchema } from "@/lib/customer-account-schema";
import { isCustomerAccountsConfigured } from "@/lib/admin-auth";
import { createCustomerPasswordHash } from "@/lib/admin-password";
import { db } from "@/lib/db";
import { isPrismaUniqueConstraintError } from "@/lib/prisma-error";
import {
  clientIpFromHeaders,
  getRegisterWindowCutoff,
  isRegisterRateLimited,
  isRegisterWindowExpired,
  registerAttemptId,
} from "@/lib/register-rate-limit";
import { isSameOriginRequest } from "@/lib/request-origin";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Request origin could not be verified." },
      { status: 403 }
    );
  }
  if (!isCustomerAccountsConfigured()) {
    return NextResponse.json(
      { success: false, error: "Account sign-up is not configured yet." },
      { status: 503 }
    );
  }

  // ---------- sign-up throttle (Round 26, anti DB-fill spam) ----------
  // Counted before validation on purpose: the point is to cap request
  // volume per IP, not per valid payload.
  const now = new Date();
  const attemptId = registerAttemptId(clientIpFromHeaders(request.headers));
  const existing = await db.registerAttempt.findUnique({ where: { id: attemptId } });
  if (existing && isRegisterWindowExpired(existing.windowStartedAt, now)) {
    await db.registerAttempt.updateMany({
      where: { id: attemptId, windowStartedAt: { lte: getRegisterWindowCutoff(now) } },
      data: { attempts: 0, windowStartedAt: now },
    });
  }
  const attempt = await db.registerAttempt.upsert({
    where: { id: attemptId },
    create: { id: attemptId, attempts: 1, windowStartedAt: now },
    update: { attempts: { increment: 1 } },
  });
  if (isRegisterRateLimited(attempt.attempts)) {
    return NextResponse.json(
      { success: false, error: "Too many sign-up attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = customerAccountRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Check your name, email, and password and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const account = await db.customerAccount.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: createCustomerPasswordHash(parsed.data.password),
      },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(
      { success: true, account },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, error: "An account already exists for this email." },
        { status: 409 }
      );
    }
    console.error("POST /api/account/register error:", error);
    return NextResponse.json(
      { success: false, error: "Account sign-up failed. Please try again." },
      { status: 500 }
    );
  }
}
