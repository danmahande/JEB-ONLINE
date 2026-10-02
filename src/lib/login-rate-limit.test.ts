import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  getLoginWindowCutoff,
  isLoginRateLimited,
  isLoginWindowExpired,
} from "./login-rate-limit";

describe("login rate limit policy", () => {
  it("limits after five attempts", () => {
    assert.equal(LOGIN_MAX_ATTEMPTS, 5);
    assert.equal(isLoginRateLimited(4), false);
    assert.equal(isLoginRateLimited(5), true);
  });

  it("resets only after the full 15-minute window", () => {
    const now = new Date("2026-10-02T12:15:00.000Z");
    assert.equal(LOGIN_WINDOW_MS, 15 * 60 * 1000);
    const cutoff = getLoginWindowCutoff(now);
    const expired = cutoff;
    const stillActive = new Date(cutoff.getTime() + 1);

    assert.equal(isLoginWindowExpired(expired, now), true);
    assert.equal(isLoginWindowExpired(stillActive, now), false);
  });
});
