import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PAYMENT_EPSILON,
  balanceDueUsd,
  derivePaymentStatus,
  isPaymentMethod,
  isPaymentStatus,
  paymentStatusLabel,
  shouldWarnBeforeDispatch,
} from "./order-payment";

// Context: this store takes no money on the site, so before round 31 there was
// nowhere to record what actually arrived and the owner's central daily
// question — "who has paid?" — was unanswerable from the dashboard. These pin
// the derivation that hangs off the new payment ledger.
describe("derivePaymentStatus", () => {
  it("is unpaid with nothing received", () => {
    assert.equal(derivePaymentStatus(100, 0), "unpaid");
    assert.equal(derivePaymentStatus(0, 0), "unpaid");
  });

  it("is partial while the balance is outstanding", () => {
    assert.equal(derivePaymentStatus(100, 1), "partial");
    assert.equal(derivePaymentStatus(100, 50), "partial");
    assert.equal(derivePaymentStatus(100, 99), "partial");
  });

  it("is paid once the total is covered, including small shortfalls", () => {
    assert.equal(derivePaymentStatus(100, 100), "paid");
    assert.equal(derivePaymentStatus(100, 250), "paid");
    // a cent short is rounding noise, not an unpaid order
    assert.equal(derivePaymentStatus(100, 100 - PAYMENT_EPSILON), "paid");
  });

  it("treats a zero-total order as settled the moment anything arrives", () => {
    // Guards a division-shaped bug: no percentage maths anywhere in this fn.
    assert.equal(derivePaymentStatus(0, 5), "paid");
  });
});

describe("balanceDueUsd", () => {
  it("never reports a negative balance", () => {
    assert.equal(balanceDueUsd(100, 0), 100);
    assert.equal(balanceDueUsd(100, 40), 60);
    assert.equal(balanceDueUsd(100, 100), 0);
    assert.equal(balanceDueUsd(100, 500), 0);
  });
});

describe("payment vocabularies", () => {
  it("recognises exactly the supported statuses and methods", () => {
    assert.equal(isPaymentStatus("unpaid"), true);
    assert.equal(isPaymentStatus("partial"), true);
    assert.equal(isPaymentStatus("paid"), true);
    assert.equal(isPaymentStatus("refunded"), false);
    assert.equal(isPaymentStatus(""), false);

    assert.equal(isPaymentMethod("MTN MoMo"), true);
    assert.equal(isPaymentMethod("Bank Transfer"), true);
    assert.equal(isPaymentMethod("Other"), true);
    assert.equal(isPaymentMethod("Bitcoin"), false);
  });

  it("labels for the owner without leaking raw enum values", () => {
    assert.equal(paymentStatusLabel("unpaid"), "UNPAID");
    assert.equal(paymentStatusLabel("partial"), "PART PAID");
    assert.equal(paymentStatusLabel("paid"), "PAID");
    assert.equal(paymentStatusLabel("something_new"), "SOMETHING NEW");
  });

  it("warns before dispatch while money is outstanding, and only then", () => {
    assert.equal(shouldWarnBeforeDispatch("unpaid"), true);
    assert.equal(shouldWarnBeforeDispatch("partial"), true);
    assert.equal(shouldWarnBeforeDispatch("paid"), false);
  });
});
