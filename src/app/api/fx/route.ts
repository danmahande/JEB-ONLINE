import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/fx
 * Cross-border trade configuration: currencies, duty/VAT rates, freight.
 */
export async function GET() {
  try {
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
