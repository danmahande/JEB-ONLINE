/**
 * Which fields each admin order action is allowed to send.
 *
 * This exists because of a real data leak: the order-detail screen used to send
 * `note: noteDraft` with EVERY action, so a half-typed note became the public
 * tracking event — and went into the customer's status email — the moment the
 * owner clicked "Mark shipped" instead of "Attach note". Order events are
 * append-only, so there was no undo.
 *
 * The rule is now expressed here, as data, so it can be tested without a browser:
 *
 *   note           — only the action that explicitly publishes a note
 *   advance        — status only; nothing customer-visible rides along
 *   cancel         — status only (the server supplies its own cancellation text)
 *   dispatch       — the real waybill, plus an optional note that the owner
 *                    typed INTO the dispatch form (a different field from the
 *                    standalone note box)
 */

export type OrderAction = "advance" | "cancel" | "note" | "dispatch";

export type OrderActionInput = {
  /** The standalone "Note for the customer" box. */
  note?: string;
  /** The real operator waybill — only meaningful for `dispatch`. */
  trackingNumber?: string;
  /** The note typed inside the dispatch form. */
  dispatchNote?: string;
};

export type OrderActionBody = {
  action: OrderAction;
  note?: string;
  trackingNumber?: string;
};

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

/**
 * Builds the PATCH body for an order action. Never lets the standalone note
 * travel with an action that does not publish it.
 */
export function buildOrderActionBody(
  action: OrderAction,
  input: OrderActionInput = {}
): OrderActionBody {
  if (action === "dispatch") {
    const trackingNumber = trimmed(input.trackingNumber);
    const note = trimmed(input.dispatchNote);
    // Keys are omitted rather than set to undefined, so the returned object is
    // exactly what goes over the wire (JSON.stringify drops undefined, which
    // otherwise makes the object and the payload disagree).
    return {
      action,
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(note ? { note } : {}),
    };
  }

  if (action === "note") {
    const note = trimmed(input.note);
    return { action, ...(note ? { note } : {}) };
  }

  // advance + cancel: status transitions only. A note sitting in the box is not
  // an instruction to publish it.
  return { action };
}

/** A dispatch is only usable with a real waybill that differs from the placeholder. */
export function dispatchBlockReason(
  trackingNumber: string,
  currentTrackingNumber: string | null,
  trackingIsPlaceholder: boolean
): string | null {
  const value = trackingNumber.trim();
  if (!value) {
    return "Enter the operator's waybill or tracking number first.";
  }
  if (trackingIsPlaceholder && value === (currentTrackingNumber ?? "")) {
    return "That is still the placeholder generated at checkout — enter the operator's real number.";
  }
  return null;
}
