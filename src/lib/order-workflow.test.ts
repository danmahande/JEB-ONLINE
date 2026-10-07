import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminCanCancel,
  customerCanCancel,
  isOrderStatus,
  nextStatus,
  statusLabel,
} from "./order-workflow";

describe("order workflow", () => {
  it("advances one step at a time and stops at delivered", () => {
    assert.equal(nextStatus("new_order"), "processing");
    assert.equal(nextStatus("processing"), "shipped");
    assert.equal(nextStatus("shipped"), "delivered");
    assert.equal(nextStatus("delivered"), null);
    assert.equal(nextStatus("cancelled"), null);
    assert.equal(nextStatus("returned"), null);
    assert.equal(nextStatus("bogus"), null);
  });

  it("allows admin cancellation only before dispatch", () => {
    assert.equal(adminCanCancel("new_order"), true);
    assert.equal(adminCanCancel("processing"), true);
    assert.equal(adminCanCancel("shipped"), false);
    assert.equal(adminCanCancel("delivered"), false);
    assert.equal(adminCanCancel("cancelled"), false);
  });

  it("allows customer cancellation only on untouched orders", () => {
    assert.equal(customerCanCancel("new_order"), true);
    assert.equal(customerCanCancel("processing"), false);
    assert.equal(customerCanCancel("shipped"), false);
  });

  it("labels statuses without underscores", () => {
    assert.equal(statusLabel("new_order"), "NEW ORDER");
    assert.equal(statusLabel("cancelled"), "CANCELLED");
    assert.equal(statusLabel("weird_status"), "WEIRD STATUS");
  });

  it("type-guards known statuses", () => {
    assert.equal(isOrderStatus("new_order"), true);
    assert.equal(isOrderStatus("nope"), false);
  });
});
