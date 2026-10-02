import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import { customerAccountRegistrationSchema } from "@/lib/customer-account-schema";
import { isCustomerAccountsConfigured } from "@/lib/admin-auth";
import { createCustomerPasswordHash } from "@/lib/admin-password";
import { db } from "@/lib/db";
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
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
