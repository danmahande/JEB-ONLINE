import { z } from "zod";

/**
 * Payload validation for the two public write endpoints.
 *
 * These routes previously validated email with an inline regex — the only gate
 * for non-browser clients — and cast the body with `as { email?: string }`.
 * A schema makes the contract explicit and rejects unknown keys instead of
 * quietly ignoring them.
 */

const emailField = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

/** Footer newsletter signup. */
export const newsletterSubscribeSchema = z
  .object({ email: emailField })
  .strict();

/** "NOTIFY ME" restock alert from a sold-out catalog tile. */
export const restockNotifySchema = z
  .object({
    // Upstream ERP identifier, e.g. "GRN-MAIZE-001".
    productId: z.string().trim().min(1).max(120),
    email: emailField,
  })
  .strict();
