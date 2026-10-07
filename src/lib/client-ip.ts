/**
 * Best-effort client IP from proxy headers.
 *
 * On Vercel the platform sets x-forwarded-for / x-real-ip. A spoofed header can
 * only move the caller between throttle buckets, never bypass the throttle
 * itself. Held here rather than in register-rate-limit.ts so every throttle uses
 * one implementation.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
