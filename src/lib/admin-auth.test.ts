import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminPasswordHash, verifyAdminPassword } from "./admin-password";

describe("admin password hashes", () => {
  it("verifies the password and rejects a different one", () => {
    const password = "launch-password-2026";
    const passwordHash = createAdminPasswordHash(password);

    assert.equal(verifyAdminPassword(password, passwordHash), true);
    assert.equal(verifyAdminPassword("different-password", passwordHash), false);
  });

  it("rejects malformed hashes and passwords below the minimum length", () => {
    assert.equal(verifyAdminPassword("short", "not-a-hash"), false);
    assert.equal(verifyAdminPassword("long-enough-password", "not-a-hash"), false);
    assert.throws(() => createAdminPasswordHash("short"), /between 14 and 1024/);
  });
});
