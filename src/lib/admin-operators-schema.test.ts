import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  operatorCreateSchema,
  operatorUpdateSchema,
} from "./admin-operators-schema";

const validOperator = {
  regionCode: "ke",
  name: "Link Bus",
  cargoRatePerKg: 1.0,
  minCharge: 10,
  transitDaysMin: 1,
  transitDaysMax: 2,
  bookingNote: "Book the parcel at the Nakawa cargo office before 9AM.",
};

describe("admin operator validation", () => {
  it("accepts a valid operator and upper-cases the corridor code", () => {
    const result = operatorCreateSchema.safeParse(validOperator);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.regionCode, "KE");
    }
  });

  it("rejects a zero cargo rate (freight must cost something)", () => {
    const result = operatorCreateSchema.safeParse({
      ...validOperator,
      cargoRatePerKg: 0,
    });
    assert.equal(result.success, false);
  });

  it("rejects a negative minimum charge", () => {
    const result = operatorCreateSchema.safeParse({
      ...validOperator,
      minCharge: -5,
    });
    assert.equal(result.success, false);
  });

  it("rejects an inverted transit window", () => {
    const result = operatorCreateSchema.safeParse({
      ...validOperator,
      transitDaysMin: 3,
      transitDaysMax: 2,
    });
    assert.equal(result.success, false);
  });

  it("rejects unknown keys (strict payload)", () => {
    const result = operatorCreateSchema.safeParse({
      ...validOperator,
      adminHint: "bypass",
    });
    assert.equal(result.success, false);
  });

  it("allows patching a single transit end", () => {
    const result = operatorUpdateSchema.safeParse({ transitDaysMax: 4 });
    assert.equal(result.success, true);
  });

  it("rejects a patch that inverts the window when both ends arrive", () => {
    const result = operatorUpdateSchema.safeParse({
      transitDaysMin: 5,
      transitDaysMax: 2,
    });
    assert.equal(result.success, false);
  });

  it("rejects an empty patch", () => {
    const result = operatorUpdateSchema.safeParse({});
    assert.equal(result.success, false);
  });
});
