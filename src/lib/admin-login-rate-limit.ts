export const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function getAdminLoginWindowCutoff(now: Date): Date {
  return new Date(now.getTime() - ADMIN_LOGIN_WINDOW_MS);
}

export function isAdminLoginWindowExpired(windowStartedAt: Date, now: Date): boolean {
  return windowStartedAt.getTime() <= getAdminLoginWindowCutoff(now).getTime();
}

export function isAdminLoginRateLimited(attempts: number): boolean {
  return attempts >= ADMIN_LOGIN_MAX_ATTEMPTS;
}
