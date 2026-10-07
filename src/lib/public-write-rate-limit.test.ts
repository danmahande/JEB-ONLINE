import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_WRITE_MAX_ATTEMPTS,
  PUBLIC_WRITE_RETRY_AFTER_SECONDS,
  PUBLIC_WRITE_WINDOW_MS,
  consumePublicWriteBudget,
  getPublicWriteWindowCutoff,
  isPublicWriteRateLimited,
  isPublicWriteWindowExpired,
  publicWriteAttemptId,
} from "./public-write-rate-limit";

// Context: /api/subscribe and /api/restock-notify accepted unlimited anonymous
// writes until this round. These pin the throttle's contract, including the two
// properties that matter most: the two endpoints must not share a bucket, and
// the raw IP must never be recoverable from the stored id.

describe("public write throttle policy", () => {
  it("blocks at the configured attempt count, not before", () => {
    assert.equal(PUBLIC_WRITE_MAX_ATTEMPTS, 10);
    assert.equal(isPublicWriteRateLimited(0), false);
    assert.equal(isPublicWriteRateLimited(PUBLIC_WRITE_MAX_ATTEMPTS - 1), false);
    assert.equal(isPublicWriteRateLimited(PUBLIC_WRITE_MAX_ATTEMPTS), true);
    assert.equal(isPublicWriteRateLimited(PUBLIC_WRITE_MAX_ATTEMPTS + 5), true);
  });

  it("advertises a Retry-After consistent with the window", () => {
    assert.equal(PUBLIC_WRITE_WINDOW_MS, 10 * 60 * 1000);
    assert.equal(PUBLIC_WRITE_RETRY_AFTER_SECONDS, 600);
  });

  it("expires the window exactly at the cutoff", () => {
    const now = new Date("2026-10-07T12:00:00.000Z");
    const cutoff = getPublicWriteWindowCutoff(now);
    assert.equal(cutoff.toISOString(), "2026-10-07T11:50:00.000Z");
    // one millisecond inside the window
    assert.equal(
      isPublicWriteWindowExpired(new Date(cutoff.getTime() + 1), now),
      false
    );
    // exactly at the cutoff counts as expired
    assert.equal(isPublicWriteWindowExpired(cutoff, now), true);
    // well before
    assert.equal(
      isPublicWriteWindowExpired(new Date(cutoff.getTime() - 60_000), now),
      true
    );
  });

  it("never puts the raw address into the stored id", () => {
    const ip = "203.0.113.77";
    const id = publicWriteAttemptId("subscribe", ip);
    assert.equal(id.length, 64); // sha256 hex
    assert.equal(id.includes(ip), false);
    assert.equal(id.includes("203"), false);
    assert.equal(id.includes("113"), false);
  });

  it("is stable per address and distinct per address", () => {
    assert.equal(
      publicWriteAttemptId("subscribe", "1.2.3.4"),
      publicWriteAttemptId("subscribe", "1.2.3.4")
    );
    assert.notEqual(
      publicWriteAttemptId("subscribe", "1.2.3.4"),
      publicWriteAttemptId("subscribe", "5.6.7.8")
    );
  });

  it("keeps the two endpoints in separate buckets", () => {
    // A burst of newsletter spam must not exhaust the restock budget, and the
    // reverse. Sharing a bucket would silently couple two unrelated forms.
    assert.notEqual(
      publicWriteAttemptId("subscribe", "1.2.3.4"),
      publicWriteAttemptId("restock-notify", "1.2.3.4")
    );
  });
});

/** Minimal in-memory stand-in for the Prisma model, enough to exercise the flow. */
function fakeDb() {
  const rows = new Map<string, { attempts: number; windowStartedAt: Date }>();
  return {
    rows,
    publicWriteAttempt: {
      async findUnique({ where }: { where: { id: string } }) {
        return rows.get(where.id) ?? null;
      },
      async updateMany({
        where,
        data,
      }: {
        where: { id: string; windowStartedAt: { lte: Date } };
        data: { attempts: number; windowStartedAt: Date };
      }) {
        const row = rows.get(where.id);
        if (row && row.windowStartedAt.getTime() <= where.windowStartedAt.lte.getTime()) {
          rows.set(where.id, { ...data });
          return { count: 1 };
        }
        return { count: 0 };
      },
      async upsert({
        where,
        create,
        update,
      }: {
        where: { id: string };
        create: { id: string; attempts: number; windowStartedAt: Date };
        update: { attempts: { increment: number } };
      }) {
        const row = rows.get(where.id);
        if (!row) {
          const fresh = {
            attempts: create.attempts,
            windowStartedAt: create.windowStartedAt,
          };
          rows.set(where.id, fresh);
          return { attempts: fresh.attempts };
        }
        row.attempts += update.attempts.increment;
        return { attempts: row.attempts };
      },
    },
  };
}

describe("consumePublicWriteBudget", () => {
  it("allows up to the limit, then refuses", async () => {
    const db = fakeDb();
    const now = new Date("2026-10-07T12:00:00.000Z");

    for (let i = 1; i < PUBLIC_WRITE_MAX_ATTEMPTS; i += 1) {
      const r = await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", now);
      assert.equal(r.limited, false, `request ${i} should be allowed`);
    }
    const atLimit = await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", now);
    assert.equal(atLimit.limited, true);
    // stays refused while the budget is exhausted
    const afterLimit = await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", now);
    assert.equal(afterLimit.limited, true);
  });

  it("gives a fresh window after the interval elapses", async () => {
    const db = fakeDb();
    const first = new Date("2026-10-07T12:00:00.000Z");
    for (let i = 0; i <= PUBLIC_WRITE_MAX_ATTEMPTS; i += 1) {
      await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", first);
    }
    assert.equal(
      (await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", first)).limited,
      true
    );

    // 11 minutes later the window has expired and the caller may try again
    const later = new Date(first.getTime() + PUBLIC_WRITE_WINDOW_MS + 60_000);
    assert.equal(
      (await consumePublicWriteBudget(db, "subscribe", "9.9.9.9", later)).limited,
      false
    );
  });

  it("counts one address's traffic against itself only", async () => {
    const db = fakeDb();
    const now = new Date("2026-10-07T12:00:00.000Z");
    for (let i = 0; i <= PUBLIC_WRITE_MAX_ATTEMPTS; i += 1) {
      await consumePublicWriteBudget(db, "subscribe", "1.1.1.1", now);
    }
    assert.equal(
      (await consumePublicWriteBudget(db, "subscribe", "1.1.1.1", now)).limited,
      true
    );
    assert.equal(
      (await consumePublicWriteBudget(db, "subscribe", "2.2.2.2", now)).limited,
      false
    );
  });
});
