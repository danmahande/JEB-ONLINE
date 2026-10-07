/**
 * Fixed-window throttle for the two unauthenticated write endpoints that had
 * none: the footer newsletter signup and the "NOTIFY ME" restock alert.
 *
 * Both accepted unlimited anonymous writes. Unique indexes stopped duplicates
 * of the SAME email, but nothing stopped one caller walking a word list or
 * inventing addresses, which fills the tables and — once order email is wired
 * up — turns the newsletter list into a spam relay.
 *
 * Same pattern as register-rate-limit.ts: the client IP is never stored, only
 * an HMAC of it, so this adds no PII. Each endpoint gets its own namespace, so
 * a burst on one cannot exhaust the other's budget.
 */

import { createHmac } from "node:crypto";

export const PUBLIC_WRITE_MAX_ATTEMPTS = 10;
export const PUBLIC_WRITE_WINDOW_MS = 10 * 60 * 1000;
export const PUBLIC_WRITE_RETRY_AFTER_SECONDS = Math.floor(
  PUBLIC_WRITE_WINDOW_MS / 1000
);

/** Endpoint namespaces — kept as a union so a typo cannot silently share a bucket. */
export type PublicWriteScope = "subscribe" | "restock-notify";

export function getPublicWriteWindowCutoff(now: Date): Date {
  return new Date(now.getTime() - PUBLIC_WRITE_WINDOW_MS);
}

export function isPublicWriteWindowExpired(
  windowStartedAt: Date,
  now: Date
): boolean {
  return windowStartedAt.getTime() <= getPublicWriteWindowCutoff(now).getTime();
}

export function isPublicWriteRateLimited(attempts: number): boolean {
  return attempts >= PUBLIC_WRITE_MAX_ATTEMPTS;
}

export function publicWriteAttemptId(
  scope: PublicWriteScope,
  clientIp: string
): string {
  const secret =
    process.env.NEXTAUTH_SECRET || "jeb-public-write-throttle";
  return createHmac("sha256", secret)
    .update(`${scope}:${clientIp}`)
    .digest("hex");
}

/**
 * The slice of the Prisma client this throttle needs. Typed explicitly so the
 * decision logic stays unit-testable without a database (see the in-memory
 * stand-in in public-write-rate-limit.test.ts).
 */
export type PublicWriteAttemptDelegate = {
  findUnique(args: {
    where: { id: string };
    select: { windowStartedAt: true };
  }): Promise<{ windowStartedAt: Date } | null>;
  updateMany(args: {
    where: { id: string; windowStartedAt: { lte: Date } };
    data: { attempts: number; windowStartedAt: Date };
  }): Promise<{ count: number }>;
  upsert(args: {
    where: { id: string };
    create: { id: string; attempts: number; windowStartedAt: Date };
    update: { attempts: { increment: number } };
  }): Promise<{ attempts: number }>;
};

/**
 * Counts one request against the caller's window and reports whether it should
 * be rejected. Kept separate from the route so the decision is unit-testable
 * without a database.
 */
export async function consumePublicWriteBudget(
  db: { publicWriteAttempt: PublicWriteAttemptDelegate },
  scope: PublicWriteScope,
  clientIp: string,
  now: Date
): Promise<{ limited: boolean; attemptId: string }> {
  const attemptId = publicWriteAttemptId(scope, clientIp);

  const existing = await db.publicWriteAttempt.findUnique({
    where: { id: attemptId },
    select: { windowStartedAt: true },
  });
  if (existing && isPublicWriteWindowExpired(existing.windowStartedAt, now)) {
    await db.publicWriteAttempt.updateMany({
      where: {
        id: attemptId,
        windowStartedAt: { lte: getPublicWriteWindowCutoff(now) },
      },
      data: { attempts: 0, windowStartedAt: now },
    });
  }

  const attempt = await db.publicWriteAttempt.upsert({
    where: { id: attemptId },
    create: { id: attemptId, attempts: 1, windowStartedAt: now },
    update: { attempts: { increment: 1 } },
  });

  return { limited: isPublicWriteRateLimited(attempt.attempts), attemptId };
}
