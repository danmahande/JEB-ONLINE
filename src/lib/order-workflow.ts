/**
 * Shared order-status workflow — the single source of truth for which
 * transitions exist, which statuses a customer or admin may cancel from,
 * and how statuses render. Round 26: introduces the `cancelled` status
 * (the schema column is a String, so no enum migration was needed).
 */

export const ORDER_STATUSES = [
  "new_order",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** One-step advancement map — the owner walks an order forward; no jumping. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new_order: "processing",
  processing: "shipped",
  shipped: "delivered",
};

/** Admin may cancel before dispatch; shipped/delivered orders are past that. */
export const ADMIN_CANCELLABLE: readonly string[] = ["new_order", "processing"];

/** Customers may cancel only while the order is still untouched. */
export const CUSTOMER_CANCELLABLE: readonly string[] = ["new_order"];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function nextStatus(current: string): OrderStatus | null {
  return NEXT_STATUS[current as OrderStatus] ?? null;
}

export function adminCanCancel(status: string): boolean {
  return ADMIN_CANCELLABLE.includes(status);
}

export function customerCanCancel(status: string): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}

/** Human label for status pills (admin + tracking). */
export function statusLabel(status: string): string {
  switch (status) {
    case "new_order":
      return "NEW ORDER";
    case "processing":
      return "PROCESSING";
    case "shipped":
      return "SHIPPED";
    case "delivered":
      return "DELIVERED";
    case "returned":
      return "RETURNED";
    case "cancelled":
      return "CANCELLED";
    default:
      return status.replaceAll("_", " ").toUpperCase();
  }
}
