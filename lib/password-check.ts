// The full check for a password someone is CHOOSING, on the server: the rules in lib/password-policy.ts, then whether it has leaked in a known breach.
import { isPwned } from "@/lib/pwned";
import { checkPassword, type PasswordCheck } from "@/lib/password-policy";

export async function checkChosenPassword(password: unknown, ctx: { email?: string; name?: string } = {}): Promise<PasswordCheck> {
  const rules = checkPassword(password, ctx); if (!rules.ok) return rules;
  if (await isPwned(password as string)) return { ok: false, reason: "breached", message: "This password has appeared in a known data breach, so it is not safe to use. Please choose a different one." };
  return { ok: true };
}
