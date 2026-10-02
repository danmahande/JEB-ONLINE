export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function getLoginWindowCutoff(now: Date): Date {
  return new Date(now.getTime() - LOGIN_WINDOW_MS);
}

export function isLoginWindowExpired(windowStartedAt: Date, now: Date): boolean {
  return windowStartedAt.getTime() <= getLoginWindowCutoff(now).getTime();
}

export function isLoginRateLimited(attempts: number): boolean {
  return attempts >= LOGIN_MAX_ATTEMPTS;
}
