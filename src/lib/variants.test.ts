import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProductVariants, readStoredVariants } from "./variants";

// Regression context: every reader of Product.variants used to call
// JSON.parse(p.variants || "[]") inline. /api/products did it inside an
// unguarded .map(), so ONE malformed row turned the entire catalog feed into a
// 500 for every buyer — while the PDP twelve files away already wrapped the
// same value in try/catch. These tests pin the shared contract.
describe("parseProductVariants (read path — must never throw)", () => {
  it("returns [] for empty, null and undefined input", () => {
    assert.deepEqual(parseProductVariants(""), []);
    assert.deepEqual(parseProductVariants(null), []);
    assert.deepEqual(parseProductVariants(undefined), []);
  });

  it("returns [] instead of throwing on malformed JSON", () => {
    assert.deepEqual(parseProductVariants("{not json"), []);
    assert.deepEqual(parseProductVariants(""), []);
    assert.deepEqual(parseProductVariants("undefined"), []);
  });

  it("returns [] when the JSON is valid but not an array", () => {
    assert.deepEqual(parseProductVariants('{"label":"25KG BAG"}'), []);
    assert.deepEqual(parseProductVariants('"25KG BAG"'), []);
    assert.deepEqual(parseProductVariants("3"), []);
    assert.deepEqual(parseProductVariants("null"), []);
  });

  it("keeps well-formed variants verbatim", () => {
    const raw = JSON.stringify([
      { label: "5KG BAG", priceDelta: -13.5, weightKg: 5 },
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
    ]);
    assert.deepEqual(parseProductVariants(raw), [
      { label: "5KG BAG", priceDelta: -13.5, weightKg: 5 },
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
    ]);
  });

  it("drops only the damaged entries, keeping the usable ones", () => {
    const raw = JSON.stringify([
      { label: "5KG BAG", priceDelta: -13.5, weightKg: 5 },
      { label: "BROKEN" },
      null,
      "nope",
      { label: "50KG BAG", priceDelta: 17.2, weightKg: 50 },
    ]);
    assert.deepEqual(parseProductVariants(raw), [
      { label: "5KG BAG", priceDelta: -13.5, weightKg: 5 },
      { label: "50KG BAG", priceDelta: 17.2, weightKg: 50 },
    ]);
  });

  it("rejects non-finite numbers rather than passing NaN into pricing", () => {
    const raw = JSON.stringify([
      { label: "BAD", priceDelta: Number.NaN, weightKg: 5 },
      { label: "ALSO BAD", priceDelta: 0, weightKg: null },
    ]);
    assert.deepEqual(parseProductVariants(raw), []);
  });
});

describe("readStoredVariants (admin write path — must report damage)", () => {
  it("treats absent and empty storage as clean", () => {
    assert.deepEqual(readStoredVariants(""), { variants: [], malformed: false });
    assert.deepEqual(readStoredVariants(null), {
      variants: [],
      malformed: false,
    });
    assert.deepEqual(readStoredVariants("[]"), {
      variants: [],
      malformed: false,
    });
  });

  it("flags unparseable, non-array and partly-invalid storage as malformed", () => {
    assert.equal(readStoredVariants("{not json").malformed, true);
    assert.equal(readStoredVariants('{"a":1}').malformed, true);
    assert.equal(
      readStoredVariants(JSON.stringify([{ label: "ok", priceDelta: 0, weightKg: 1 }, 7]))
        .malformed,
      true
    );
  });

  it("returns the usable variants alongside the flag", () => {
    const result = readStoredVariants(
      JSON.stringify([
        { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
        null,
      ])
    );
    assert.deepEqual(result.variants, [
      { label: "25KG BAG", priceDelta: 0, weightKg: 25 },
    ]);
    assert.equal(result.malformed, true);
  });
});
