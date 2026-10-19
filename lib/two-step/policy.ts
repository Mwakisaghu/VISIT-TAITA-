// Who must use two-step sign-in, and what a half-finished sign-in is allowed to see. Pure: no database, no framework, so the sign-in code and the admin gate (which runs at the edge) share it.
export const STAFF = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as const;
export const MONEY_ROLES = ["PARTNER", "SELLER", "EVENT_MANAGER"] as const; // they handle other people's money, so they follow after a grace period

export type Rule = { available: boolean; moneyRolesFrom?: Date | null; now?: number };
/** Is this person REQUIRED to have two-step? Never when the feature is not available (no key set): turning the key on is the switch that starts it. */
export function requiresTwoStep(role: unknown, rule: Rule): boolean {
  if (!rule.available) return false; const r = String(role);
  if ((STAFF as readonly string[]).includes(r)) return true;
  if ((MONEY_ROLES as readonly string[]).includes(r)) { const from = rule.moneyRolesFrom; return !!from && !Number.isNaN(from.getTime()) && (rule.now ?? Date.now()) >= from.getTime(); }
  return false;
}
/** May this person turn two-step off for themselves? Not if it is required of them. */
export const mayTurnOff = (role: unknown, rule: Rule): boolean => !requiresTwoStep(role, rule);
/** The date from which money-handling roles must use it, from the setting TWO_FACTOR_MONEY_ROLES_FROM (for example 2026-12-01). */
export function parseMoneyFrom(raw: string | undefined = process.env.TWO_FACTOR_MONEY_ROLES_FROM): Date | null { const v = (raw ?? "").trim(); if (!v) return null; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00+03:00` : v); return Number.isNaN(d.getTime()) ? null : d; }

/** What a person who must set up two-step but has not yet is allowed to be: nobody special. Their role is set aside (not removed) until they finish, so EVERY existing admin check refuses them without any of them needing to know. */
export const RESTRICTED_ROLE = "VISITOR";
export const SETUP_PATH = "/account/security/two-step";
/** For the admin gate: the token of someone who still has to set up two-step goes to the setup page, not the sign-in page. */
export function gateDecision(token: unknown): "setup" | "pass" { return (token as { twoStepSetupRequired?: unknown } | null)?.twoStepSetupRequired === true ? "setup" : "pass"; }

// ---- the weaker, member-only conveniences ----
// An emailed code and "remember this browser" are weaker than an authenticator app (anyone who controls the person's inbox could use the first; anyone who holds the browser could use the second), so they are
// offered only where the account cannot do much harm: NEVER to staff, and never to the roles that handle other people's money (even before their requirement date, so no one has to switch later).
const isStaffOrMoney = (role: unknown): boolean => (STAFF as readonly string[]).includes(String(role)) || (MONEY_ROLES as readonly string[]).includes(String(role));
/** May this person use an emailed code instead of an authenticator app? */
export const canUseEmailMethod = (role: unknown): boolean => typeof role === "string" && role.length > 0 && !isStaffOrMoney(role); // an unknown or missing role is refused: a rule that grants something weaker must default to no
/** May this person tell us to remember a browser for 30 days? */
export const canTrustBrowser = (role: unknown): boolean => typeof role === "string" && role.length > 0 && !isStaffOrMoney(role);
/** Does the way they have two-step set up meet what is required of them? Whoever must use it needs the authenticator app; an emailed code does not count for them. */
export const methodMeetsRequirement = (method: unknown, role: unknown, rule: Rule): boolean => !requiresTwoStep(role, rule) || method === "TOTP";
