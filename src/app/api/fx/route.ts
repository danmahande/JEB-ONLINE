import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshFxRatesIfStale } from "@/lib/fx";

/**
 * GET /api/fx
 * Cross-border trade configuration: currencies, duty/VAT rates, freight.
 * Rates are refreshed from a live FX API when older than the TTL — see
 * src/lib/fx.ts. Display + checkout conversions both read from here.
 */
export async function GET() {
  try {
    await refreshFxRatesIfStale();
    const regions = await db.regionConfig.findMany({
      orderBy: { region: "asc" },
    });
    return NextResponse.json({ success: true, regions });
  } catch (error) {
    console.error("GET /api/fx error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load trade config" },
      { status: 500 }
    );
  }
}
