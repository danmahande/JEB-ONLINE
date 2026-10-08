import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/order-payment";

/**
 * Payload validation for recording a received payment.
 *
 * The amount is the owner's own figure, but it is still bounded: an order total
 * is USD and the store's largest realistic consignment is far below this ceiling,
 * so a misplaced decimal (or a stray keystroke) is rejected rather than written
 * into the ledger.
 */
export const paymentRecordSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    amountUsd: z
      .number()
      .finite()
      .positive("A payment must be more than zero.")
      .max(1_000_000, "That amount looks wrong.")
      // Two decimal places: anything finer is a typo, not a rounding artefact.
      .refine(
        (value) => Math.round(value * 100) / 100 === value,
        "Use at most two decimal places."
      ),
    reference: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;

/**
 * Payload validation for dispatch (the real waybill).
 *
 * The checkout generates a placeholder tracking number, so this is where the
 * number the customer actually needs comes from.
 */
export const dispatchSchema = z
  .object({
    trackingNumber: z
      .string()
      .trim()
      .min(3, "Enter the operator's waybill or tracking number.")
      .max(80),
    /** Appended to the status event so it appears on the customer's tracking page. */
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type DispatchInput = z.infer<typeof dispatchSchema>;
