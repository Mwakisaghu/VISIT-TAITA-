// How long a sign-in may last. Pure and dependency-free, so the sign-in code AND the admin gate in middleware (which runs at the edge) share one rule.
//   * Staff (anyone who can enter /admin): at most 12 hours from the moment they typed their password, however busy they are. A token that is refreshed does not reset this clock,
//     so a stolen admin cookie cannot stay useful for weeks. After 12 hours they sign in again.
//   * Everyone else: the session lasts 14 days from the last visit (it was 30), then they sign in again.
export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as const;
export const STAFF_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/** True if this sign-in token belongs to staff and has outlived its 12 hours (or does not say when it began, which counts as expired). */
export function staffSessionExpired(token: object | null | undefined, now: number = Date.now()): boolean {
  const t = token as { role?: unknown; signedInAt?: unknown } | null | undefined;
  if (!t || !(STAFF_ROLES as readonly string[]).includes(String(t.role))) return false;
  const began = typeof t.signedInAt === "number" && Number.isFinite(t.signedInAt) ? t.signedInAt : NaN;
  if (Number.isNaN(began)) return true;
  const age = now - began;
  return age >= 0 && age > STAFF_SESSION_MAX_MS; // a clock that is wrong in the future never ends a session early
}
