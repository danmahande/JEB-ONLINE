import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerAccountRegistrationSchema } from "./customer-account-schema";

describe("customer account registration validation", () => {
  it("normalizes the name and email and accepts a 12-character password", () => {
    const result = customerAccountRegistrationSchema.safeParse({
      name: "  Amina Okello  ",
      email: "  AMINA@EXAMPLE.COM ",
      password: "customer-pass-12",
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.name, "Amina Okello");
    assert.equal(result.data.email, "amina@example.com");
  });

  it("rejects short passwords and additional request fields", () => {
    const invalidPassword = customerAccountRegistrationSchema.safeParse({
      name: "Amina Okello",
      email: "amina@example.com",
      password: "short",
    });
    const extraField = customerAccountRegistrationSchema.safeParse({
      name: "Amina Okello",
      email: "amina@example.com",
      password: "customer-pass-12",
      role: "admin",
    });
    assert.equal(invalidPassword.success, false);
    assert.equal(extraField.success, false);
  });
});
