import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REGISTER_MAX_ATTEMPTS,
  REGISTER_WINDOW_MS,
  getRegisterWindowCutoff,
  isRegisterRateLimited,
  isRegisterWindowExpired,
  registerAttemptId,
} from "./register-rate-limit";

describe("register rate limit policy", () => {
  it("limits after five attempts in the window", () => {
    assert.equal(REGISTER_MAX_ATTEMPTS, 5);
    assert.equal(isRegisterRateLimited(4), false);
    assert.equal(isRegisterRateLimited(5), true);
  });

  it("uses a 15-minute fixed window", () => {
    assert.equal(REGISTER_WINDOW_MS, 15 * 60 * 1000);
    const now = new Date("2026-10-07T09:30:00.000Z");
    const cutoff = getRegisterWindowCutoff(now);
    assert.equal(isRegisterWindowExpired(cutoff, now), true);
    assert.equal(isRegisterWindowExpired(new Date(cutoff.getTime() + 1), now), false);
  });

  it("derives a stable per-IP id without storing the raw IP", () => {
    process.env.NEXTAUTH_SECRET = "test-secret-value-0123456789abcdef";
    const a = registerAttemptId("1.2.3.4");
    const b = registerAttemptId("1.2.3.4");
    const c = registerAttemptId("5.6.7.8");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.ok(!a.includes("1.2.3.4"));
  });
});
