import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderActionBody,
  dispatchBlockReason,
} from "./admin-order-action";

// Regression context (H1 in docs/admin-dashboard-evaluation.md): the order
// detail screen sent the standalone note box with EVERY action, so a half-typed
// note became the public tracking event and the customer's status email when the
// owner clicked "Mark shipped". These tests lock the rule that a note only
// travels with the action that publishes it.
describe("buildOrderActionBody — the note-leak rule", () => {
  it("never attaches the standalone note to advance", () => {
    const body = buildOrderActionBody("advance", { note: "half-typed thought" });
    assert.deepEqual(body, { action: "advance" });
    assert.equal("note" in body, false);
  });

  it("never attaches the standalone note to cancel", () => {
    const body = buildOrderActionBody("cancel", { note: "half-typed thought" });
    assert.deepEqual(body, { action: "cancel" });
    assert.equal("note" in body, false);
  });

  it("attaches the note only when the note action is explicit", () => {
    assert.deepEqual(buildOrderActionBody("note", { note: "  Loading Tuesday  " }), {
      action: "note",
      note: "Loading Tuesday",
    });
  });

  it("omits an empty or whitespace-only note rather than sending blank text", () => {
    assert.deepEqual(buildOrderActionBody("note", { note: "   " }), { action: "note" });
    assert.deepEqual(buildOrderActionBody("note", { note: "" }), { action: "note" });
    assert.deepEqual(buildOrderActionBody("note", {}), { action: "note" });
  });

  it("sends the waybill and the dispatch-form note together on dispatch", () => {
    assert.deepEqual(
      buildOrderActionBody("dispatch", {
        trackingNumber: " LB-4471 ",
        dispatchNote: " Tuesday run, driver Amos ",
        // A note left in the standalone box must NOT ride along with dispatch.
        note: "unrelated half-typed thought",
      }),
      {
        action: "dispatch",
        trackingNumber: "LB-4471",
        note: "Tuesday run, driver Amos",
      }
    );
  });

  it("does not treat the standalone box as a dispatch note", () => {
    const body = buildOrderActionBody("dispatch", {
      trackingNumber: "LB-4471",
      note: "unrelated half-typed thought",
    });
    assert.equal(body.note, undefined);
  });
});

describe("dispatchBlockReason", () => {
  it("requires a number", () => {
    assert.match(String(dispatchBlockReason("", "TRK-DS1-UG", true)), /waybill/);
    assert.match(String(dispatchBlockReason("   ", "TRK-DS1-UG", true)), /waybill/);
  });

  it("refuses to re-submit the checkout placeholder as if it were real", () => {
    const reason = dispatchBlockReason("TRK-DS1-UG", "TRK-DS1-UG", true);
    assert.match(String(reason), /placeholder/);
  });

  it("accepts a real waybill", () => {
    assert.equal(dispatchBlockReason("LB-4471", "TRK-DS1-UG", true), null);
  });

  it("accepts a number that merely repeats a confirmed real one", () => {
    // Once the placeholder has been replaced, equality is no longer suspicious.
    assert.equal(dispatchBlockReason("LB-4471", "LB-4471", false), null);
  });
});
