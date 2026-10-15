// Rules for the account's own security actions: what a name may be, and what is checked when someone changes their password.
// Pure (no database, no framework), so the browser can give instant feedback with the SAME rules the server then enforces.
import { checkPassword, PASSWORD_MAX_BYTES, PASSWORD_MIN, type PasswordCheck } from "@/lib/password-policy";

export const NAME_MIN = 2, NAME_MAX = 80; // the sign-up form's own limits
export type NameCode = "name_short" | "name_long" | "name_invalid";
export type NameCheck = { ok: true; name: string } | { ok: false; code: NameCode };

// Not allowed in a name: control characters, invisible ones that make a name look different from what it is (zero-width, direction overrides),
// angle brackets (names are put into emails and tickets), and "@" (a name that is really an email address).
const BAD = /[\p{Cc}\u200B\uFEFF\u202A-\u202E\u2066-\u2069<>@]/u;
/** A name tidied the way a person would write it: one space between words, none at the ends; refused if it is not plausibly a name. */
export function cleanName(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, code: "name_invalid" };
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (BAD.test(name) || (name.length > 0 && !/\p{L}/u.test(name))) return { ok: false, code: "name_invalid" };
  const length = [...name].length;
  if (length < NAME_MIN) return { ok: false, code: "name_short" };
  if (length > NAME_MAX) return { ok: false, code: "name_long" };
  return { ok: true, name };
}

export type PasswordChangeCode = "missing_current" | "same_password" | "weak";
export type PasswordChangeCheck = { ok: true } | { ok: false; code: PasswordChangeCode; policy?: Exclude<PasswordCheck, { ok: true }> };
/** The checks that need no database: a current password was given, the new one is different and strong enough. (The server also checks the current one is RIGHT.) */
export function checkPasswordChange(current: unknown, next: unknown, ctx: { email?: string; name?: string } = {}): PasswordChangeCheck {
  if (typeof current !== "string" || current.length === 0) return { ok: false, code: "missing_current" };
  if (current === next) return { ok: false, code: "same_password" };
  const strength = checkPassword(next, ctx);
  return strength.ok ? { ok: true } : { ok: false, code: "weak", policy: strength };
}
export { PASSWORD_MIN, PASSWORD_MAX_BYTES };
