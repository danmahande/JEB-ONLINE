// Server-side live FX refresh — keeps RegionConfig.rateToUsd in sync with
// real market rates so every conversion (catalog display, region switch,
// checkout) uses live values with zero client changes.
//
// Provider: open.er-api.com (ExchangeRate-API open endpoint) — free, no API
// key, daily-updated, covers UGX / KES / TZS / RWF + majors.
//
// Contract with the rest of the app:
//  - NEVER throws into pricing paths: any failure keeps the last known rate
//    (initially the seeded defaults) and only logs.
//  - Deduplicated: concurrent callers share one in-flight refresh.
//  - TTL-gated: the API updates once a day; we re-fetch at most every 6h.

import { db } from "@/lib/db";

const FX_API_URL = "https://open.er-api.com/v6/latest/USD";
const FX_TTL_MS = 6 * 60 * 60 * 1000; // re-fetch at most every 6 hours
const FETCH_TIMEOUT_MS = 4000; // never stall a page load or checkout for long

let inflight: Promise<boolean> | null = null;

type ErApiPayload = {
  result?: string;
  rates?: Record<string, number>;
};

/** Refresh all region rates from the FX API. Resolves true if applied. */
export async function refreshFxRates(): Promise<boolean> {
  const res = await fetch(FX_API_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FX API responded ${res.status}`);
  const data = (await res.json()) as ErApiPayload;
  if (data.result !== "success" || !data.rates) {
    throw new Error("FX API returned an unexpected payload");
  }

  const regions = await db.regionConfig.findMany({
    select: { region: true, currency: true, rateToUsd: true },
  });
  const now = new Date();
  const updates = regions
    .map((r) => {
      // USD-pegged regions are pinned at exactly 1 regardless of the API.
      const live = r.currency === "USD" ? 1 : data.rates?.[r.currency];
      // Keep the previous rate unless the API gave a sane positive number.
      const next =
        typeof live === "number" && Number.isFinite(live) && live > 0
          ? live
          : null;
      return { region: r.region, next };
    })
    .filter((u): u is { region: string; next: number } => u.next !== null);

  if (updates.length === 0) throw new Error("FX API had no usable rates");

  await db.$transaction(
    updates.map((u) =>
      db.regionConfig.update({
        where: { region: u.region },
        data: { rateToUsd: u.next, fxUpdatedAt: now },
      })
    )
  );
  return true;
}

/**
 * Refresh only if the stored rates are older than the TTL.
 * Safe to call on every request: fresh data = one cheap DB read.
 */
export async function refreshFxRatesIfStale(): Promise<void> {
  try {
    const freshest = await db.regionConfig.findFirst({
      orderBy: { fxUpdatedAt: { sort: "desc", nulls: "last" } },
      select: { fxUpdatedAt: true },
    });
    const age = freshest?.fxUpdatedAt
      ? Date.now() - freshest.fxUpdatedAt.getTime()
      : Infinity;
    if (age < FX_TTL_MS) return;
    // Share one refresh across concurrent callers; never rethrow — pricing
    // falls back to the last stored rate when the upstream API is down.
    inflight ??= refreshFxRates()
      .catch((err) => {
        console.error("FX refresh failed — keeping stored rates:", err);
        return false;
      })
      .finally(() => {
        inflight = null;
      });
    await inflight;
  } catch (err) {
    console.error("FX staleness check failed — keeping stored rates:", err);
  }
}
