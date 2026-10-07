import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  newsletterSubscribeSchema,
  restockNotifySchema,
} from "./public-write-schema";

// Context: both public write endpoints previously validated only with an inline
// regex and cast the body (`as { email?: string }`). These pin the schema the
// routes now rely on — including that unknown keys are rejected rather than
// silently ignored, since "strict" is what stops a payload smuggling extra
// fields into the handler.

describe("newsletterSubscribeSchema", () => {
  it("accepts a valid address and lowercases it", () => {
    const r = newsletterSubscribeSchema.safeParse({ email: "  Buyer@Example.COM " });
    assert.equal(r.success, true);
    assert.equal(r.success && r.data.email, "buyer@example.com");
  });

  it("rejects missing, empty and malformed addresses", () => {
    for (const body of [{}, { email: "" }, { email: "   " }, { email: "nope" }, { email: "a@b" }, { email: "a@b.c" }]) {
      assert.equal(
        newsletterSubscribeSchema.safeParse(body).success,
        false,
        `should reject ${JSON.stringify(body)}`
      );
    }
  });

  it("rejects an address longer than the column allows", () => {
    const long = `${"a".repeat(250)}@example.com`;
    assert.equal(newsletterSubscribeSchema.safeParse({ email: long }).success, false);
  });

  it("rejects unknown keys instead of ignoring them", () => {
    const r = newsletterSubscribeSchema.safeParse({
      email: "a@b.com",
      role: "admin",
    });
    assert.equal(r.success, false);
  });
});

describe("restockNotifySchema", () => {
  it("accepts a product id plus address and normalises the address", () => {
    const r = restockNotifySchema.safeParse({
      productId: " GRN-MAIZE-001 ",
      email: "Buyer@Example.com",
    });
    assert.equal(r.success, true);
    assert.equal(r.success && r.data.productId, "GRN-MAIZE-001");
    assert.equal(r.success && r.data.email, "buyer@example.com");
  });

  it("requires a non-empty product id", () => {
    for (const body of [
      { email: "a@b.com" },
      { productId: "", email: "a@b.com" },
      { productId: "   ", email: "a@b.com" },
    ]) {
      assert.equal(
        restockNotifySchema.safeParse(body).success,
        false,
        `should reject ${JSON.stringify(body)}`
      );
    }
  });

  it("rejects an over-long product id and unknown keys", () => {
    assert.equal(
      restockNotifySchema.safeParse({
        productId: "x".repeat(200),
        email: "a@b.com",
      }).success,
      false
    );
    assert.equal(
      restockNotifySchema.safeParse({
        productId: "GRN-1",
        email: "a@b.com",
        qty: 5,
      }).success,
      false
    );
  });
});
