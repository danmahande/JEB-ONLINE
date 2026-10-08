/**
 * Order payment state — the rule set for the no-payment-gateway model.
 *
 * This store takes no money on the site: checkout records only the method the
 * buyer intends to use, and payment is arranged by hand. Before round 31 there
 * was no record of what actually arrived, so "who has paid" was unanswerable
 * from the dashboard (and the only places to put it — an order note — render on
 * the customer's public tracking page).
 *
 * These helpers are pure so the derivation is testable without a database.
 */

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Methods the checkout offers. Kept in step with the storefront's picker
 * (src/components/storefront/checkout.tsx); "Other" exists because the owner
 * also takes arrangements the site does not list.
 */
export const PAYMENT_METHODS = [
  "MTN MoMo",
  "M-Pesa",
  "Airtel Money",
  "Bank Transfer",
  "Cash on Delivery",
  "Other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Anything smaller than this is treated as already-settled rounding noise. */
export const PAYMENT_EPSILON = 0.01;

/**
 * Derives the order's payment state from the amount received against the order
 * total.
 *
 * Overpayment is deliberately reported as "paid", not as a separate state: the
 * money did arrive. The excess is visible in the payment list, and inventing a
 * fourth status would complicate the one filter the owner actually uses.
 */
export function derivePaymentStatus(
  totalAmount: number,
  paidAmountUsd: number
): PaymentStatus {
  if (paidAmountUsd <= 0) return "unpaid";
  if (paidAmountUsd + PAYMENT_EPSILON >= totalAmount) return "paid";
  return "partial";
}

/** Outstanding balance, never negative. */
export function balanceDueUsd(totalAmount: number, paidAmountUsd: number): number {
  const remaining = totalAmount - paidAmountUsd;
  return remaining > PAYMENT_EPSILON ? remaining : 0;
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "PAID";
    case "partial":
      return "PART PAID";
    case "unpaid":
      return "UNPAID";
    default:
      return status.replaceAll("_", " ").toUpperCase();
  }
}

/**
 * Whether the owner may advance an unpaid order.
 *
 * Not a hard block: dispatch decisions belong to the owner (a trusted repeat
 * buyer, or COD which pays on arrival, must not be stuck). The UI warns instead
 * of preventing, and this predicate is what the warning is keyed on — so the
 * rule lives in one place rather than in a JSX condition.
 */
export function shouldWarnBeforeDispatch(paymentStatus: string): boolean {
  return paymentStatus === "unpaid" || paymentStatus === "partial";
}
