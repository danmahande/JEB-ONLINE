import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { operatorUpdateSchema } from "@/lib/admin-operators-schema";
import { isSameOriginRequest } from "@/lib/request-origin";
import { prismaErrorCode } from "@/lib/prisma-error";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/operators/[id]
 * Edit a bus cargo operator's tariff, transit window, booking note, ordering
 * or active flag. Orders snapshot name + tariff at checkout, so edits here
 * change FUTURE quotes only — historical order money is never rewritten.
 * A transit-window change that arrives one end at a time is validated
 * against the stored row so min/max can never cross.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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
        { success: false, error: "Sign in to manage operators." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const parsed = operatorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldError = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .find((m): m is string => Boolean(m));
      return NextResponse.json(
        { success: false, error: fieldError ?? "Check the operator details and try again." },
        { status: 400 }
      );
    }

    const existing = await db.busOperator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Operator not found." },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const transitDaysMin = data.transitDaysMin ?? existing.transitDaysMin;
    const transitDaysMax = data.transitDaysMax ?? existing.transitDaysMax;
    if (transitDaysMax < transitDaysMin) {
      return NextResponse.json(
        { success: false, error: "Transit maximum must be at least the minimum." },
        { status: 400 }
      );
    }

    const operator = await db.busOperator.update({
      where: { id },
      data,
    });

    return NextResponse.json(
      { success: true, operator },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (prismaErrorCode(error) === "P2025") {
      return NextResponse.json(
        { success: false, error: "Operator not found." },
        { status: 404 }
      );
    }
    console.error("PATCH /api/admin/operators/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update the operator." },
      { status: 500 }
    );
  }
}
