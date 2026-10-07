/**
 * Fixed-window throttle for storefront account sign-ups (Round 26).
 * Mirrors the login throttle's shape (login-rate-limit.ts) but keyed by an
 * HMAC of the client IP — the raw IP is never stored, same pattern as
 * AdminLoginAttempt / CustomerLoginAttempt. Purpose: block DB-fill spam
 * (audit advisory, Round 22) without blocking a shared NAT outright —
 * 5 sign-ups per 15 minutes per IP is far above any human checkout pace.
 */

import { createHmac } from "node:crypto";

export const REGISTER_MAX_ATTEMPTS = 5;
export const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export function getRegisterWindowCutoff(now: Date): Date {
  return new Date(now.getTime() - REGISTER_WINDOW_MS);
}

export function isRegisterWindowExpired(windowStartedAt: Date, now: Date): boolean {
  return windowStartedAt.getTime() <= getRegisterWindowCutoff(now).getTime();
}

export function isRegisterRateLimited(attempts: number): boolean {
  return attempts >= REGISTER_MAX_ATTEMPTS;
}

export function registerAttemptId(clientIp: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "jeb-register-throttle";
  return createHmac("sha256", secret).update(`register:${clientIp}`).digest("hex");
}

/**
 * Best-effort client IP from proxy headers. On Vercel the platform sets
 * x-forwarded-for / x-real-ip; a spoofed header can only move the caller
 * between buckets, never bypass the throttle itself.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
