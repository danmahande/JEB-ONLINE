import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_LOGIN_MAX_ATTEMPTS,
  ADMIN_LOGIN_WINDOW_MS,
  getAdminLoginWindowCutoff,
  isAdminLoginRateLimited,
  isAdminLoginWindowExpired,
} from "./admin-login-rate-limit";

describe("admin login rate limit policy", () => {
  it("limits the owner after five attempts", () => {
    assert.equal(ADMIN_LOGIN_MAX_ATTEMPTS, 5);
    assert.equal(isAdminLoginRateLimited(4), false);
    assert.equal(isAdminLoginRateLimited(5), true);
  });

  it("resets only after the full 15-minute window", () => {
    const now = new Date("2026-10-02T12:15:00.000Z");
    const cutoff = getAdminLoginWindowCutoff(now);
    const expired = cutoff;
    const stillActive = new Date(cutoff.getTime() + 1);

    assert.equal(isAdminLoginWindowExpired(expired, now), true);
    assert.equal(isAdminLoginWindowExpired(stillActive, now), false);
  });
});
