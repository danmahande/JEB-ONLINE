import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/shipping/operators?region=KE
 * Public catalog of bus cargo operators serving a region — the checkout
 * operator picker reads this. Whitelisted fields only (no timestamps, no
 * internals); rates are USD per kg with a per-consignment minimum.
 * Without a region param the full active fleet is returned, so one fetch
 * can hydrate every corridor.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region")?.trim().toUpperCase();

    if (region !== undefined && region !== "" && !/^[A-Z]{2,4}$/.test(region)) {
      return NextResponse.json(
        { success: false, error: "Invalid region code" },
        { status: 400 }
      );
    }

    const operators = await db.busOperator.findMany({
      where: {
        isActive: true,
        ...(region ? { regionCode: region } : {}),
      },
      orderBy: [{ regionCode: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        regionCode: true,
        name: true,
        cargoRatePerKg: true,
        minCharge: true,
        transitDaysMin: true,
        transitDaysMax: true,
        bookingNote: true,
      },
    });

    return NextResponse.json(
      { success: true, operators },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("GET /api/shipping/operators error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load shipping operators" },
      { status: 500 }
    );
  }
}
