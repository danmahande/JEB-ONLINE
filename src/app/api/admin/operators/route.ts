import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { operatorCreateSchema } from "@/lib/admin-operators-schema";
import { isSameOriginRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/operators
 * The full fleet, active and inactive — the /admin/operators dashboard.
 */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Sign in to manage operators." },
        { status: 401 }
      );
    }

    const operators = await db.busOperator.findMany({
      orderBy: [{ regionCode: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      { success: true, operators },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/operators error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load operators." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/operators  { regionCode, name, cargoRatePerKg, minCharge,
 *                              transitDaysMin, transitDaysMax, bookingNote }
 * Adds an operator to a corridor. The (regionCode, name) pair is unique —
 * the same operator may serve several corridors under separate rows.
 */
export async function POST(req: NextRequest) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const parsed = operatorCreateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldError = Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .find((m): m is string => Boolean(m));
      return NextResponse.json(
        { success: false, error: fieldError ?? "Check the operator details and try again." },
        { status: 400 }
      );
    }

    const region = await db.regionConfig.findUnique({
      where: { region: parsed.data.regionCode },
    });
    if (!region) {
      return NextResponse.json(
        { success: false, error: `Unknown region ${parsed.data.regionCode}.` },
        { status: 400 }
      );
    }

    const duplicate = await db.busOperator.findUnique({
      where: {
        regionCode_name: {
          regionCode: parsed.data.regionCode,
          name: parsed.data.name,
        },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `${parsed.data.name} already serves ${parsed.data.regionCode}.`,
        },
        { status: 409 }
      );
    }

    const operator = await db.busOperator.create({ data: parsed.data });

    return NextResponse.json(
      { success: true, operator },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/operators error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create the operator." },
      { status: 500 }
    );
  }
}
