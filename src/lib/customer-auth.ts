import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createCustomerPasswordHash,
  verifyCustomerPassword,
  MINIMUM_CUSTOMER_PASSWORD_LENGTH,
} from "@/lib/admin-password";
import {
  isLoginRateLimited,
  isLoginWindowExpired,
  getLoginWindowCutoff,
  LOGIN_MAX_ATTEMPTS,
} from "@/lib/login-rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(MINIMUM_CUSTOMER_PASSWORD_LENGTH).max(1024),
});

const DUMMY_PASSWORD_HASH = createCustomerPasswordHash(
  randomBytes(32).toString("hex")
);

export async function authorizeCustomer(
  credentials: Record<string, unknown> | undefined
) {
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    return null;
  }

  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const now = new Date();
  const id = createHmac("sha256", process.env.NEXTAUTH_SECRET)
    .update(parsed.data.email)
    .digest("hex");
  let existingAttempt = await db.customerLoginAttempt.findUnique({ where: { id } });

  if (
    existingAttempt &&
    isLoginWindowExpired(existingAttempt.windowStartedAt, now)
  ) {
    const reset = await db.customerLoginAttempt.updateMany({
      where: { id, windowStartedAt: { lte: getLoginWindowCutoff(now) } },
      data: { attempts: 0, windowStartedAt: now },
    });
    existingAttempt =
      reset.count > 0
        ? { ...existingAttempt, attempts: 0, windowStartedAt: now }
        : await db.customerLoginAttempt.findUnique({ where: { id } });
  }

  if (
    existingAttempt &&
    isLoginRateLimited(existingAttempt.attempts)
  ) {
    return null;
  }

  const attempt = await db.customerLoginAttempt.upsert({
    where: { id },
    create: { id, attempts: 1, windowStartedAt: now },
    update: { attempts: { increment: 1 } },
  });
  if (attempt.attempts > LOGIN_MAX_ATTEMPTS) return null;

  const account = await db.customerAccount.findUnique({
    where: { email: parsed.data.email },
  });
  const passwordMatches = verifyCustomerPassword(
    parsed.data.password,
    account?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!account || !passwordMatches) return null;

  await db.customerLoginAttempt.deleteMany({ where: { id } });
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: "customer" as const,
  };
}
