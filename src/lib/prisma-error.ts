/**
 * Duck-typed Prisma error inspection.
 *
 * Auditor repair (ROUND 22, offense #42): the register, admin-products and
 * orders routes used `error instanceof PrismaClientKnownRequestError`, which
 * is FALSE under the Next.js production bundle — the error class is resolved
 * through more than one module instance, so `instanceof` fails across the
 * chunk boundary. Proven live at R22: a duplicate registration returned 500
 * instead of the intended 409, and the orders sequence-conflict retry loop
 * never retried. Checking `error.code` directly is the bundling-safe
 * contract: PrismaClientKnownRequestError always carries `code` and `meta`.
 */
export function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return prismaErrorCode(error) === "P2002";
}

export function isPrismaRecordNotFoundError(error: unknown): boolean {
  return prismaErrorCode(error) === "P2025";
}
