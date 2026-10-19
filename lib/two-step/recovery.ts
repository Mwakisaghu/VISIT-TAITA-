// Recovery codes: the way back in when the phone is lost. Ten, each used once, shown to the person once. 8 characters from an alphabet without look-alikes (no 0, O, 1, I) is 40 bits each, and they are stored only as keyed fingerprints.
import { randomInt } from "node:crypto";
import { keyedHash } from "@/lib/two-step/crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 characters: no I, O, 0 or 1
export const RECOVERY_COUNT = 10;
export const makeRecoveryCode = (): string => { let s = ""; for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)]; return `${s.slice(0, 4)}-${s.slice(4)}`; };
export const makeRecoveryCodes = (n = RECOVERY_COUNT): string[] => { const set = new Set<string>(); while (set.size < n) set.add(makeRecoveryCode()); return [...set]; };
/** What was typed, in the form we compare: letters upper-case, no spaces or dashes. Null if it cannot be a recovery code. */
export function cleanRecovery(input: unknown): string | null {
  if (typeof input !== "string") return null; const c = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-HJ-NP-Z2-9]{8}$/.test(c) ? c : null;
}
export const recoveryHash = (clean: string, key: Buffer): string => keyedHash("recovery", clean, key);
