// Time-based one-time passwords (RFC 6238), as every authenticator app makes them: HMAC-SHA1 of the 30-second time step, 6 digits. Pure and dependency-free apart from Node's crypto.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const STEP_SECONDS = 30;
export const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, ""); let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) { const i = B32.indexOf(ch); if (i < 0) throw new Error("Not a base32 text."); value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
/** A new secret: 160 random bits, the size authenticator apps expect, as base32 text. */
export const newSecret = (): string => base32Encode(randomBytes(20));
/** The secret in groups of four, for typing by hand. */
export const groupSecret = (s: string): string => s.replace(/(.{4})(?=.)/g, "$1 ");

export function hotp(secret: Buffer, counter: number, digits = DIGITS): string {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest(); const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}
export const stepAt = (ms: number): number => Math.floor(ms / 1000 / STEP_SECONDS);
export const totpAt = (secretB32: string, ms: number): string => hotp(base32Decode(secretB32), stepAt(ms));

/** Turns what a person typed ("123 456", "123-456") into six digits, or null if it is not that. */
export function cleanCode(input: unknown): string | null {
  if (typeof input !== "string") return null; const d = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(d) ? d : null;
}

/**
 * Checks a typed code. A code from the previous or next 30 seconds is accepted (phone clocks drift), but never one for a step at or before `afterStep`: that is how a code that
 * was already used cannot be used again. Returns the step that matched (so the caller can remember it), or null. Every candidate is compared in constant time and none is skipped.
 */
export function verifyTotp(secretB32: string, input: unknown, opts: { now?: number; window?: number; afterStep?: number | null } = {}): number | null {
  const code = cleanCode(input); if (!code) return null;
  const now = opts.now ?? Date.now(), window = opts.window ?? 1, after = opts.afterStep ?? -1; const secret = base32Decode(secretB32); const center = stepAt(now); const typed = Buffer.from(code);
  let matched: number | null = null;
  for (let s = center - window; s <= center + window; s++) {
    const same = timingSafeEqual(typed, Buffer.from(hotp(secret, s)));
    if (same && s > after && (matched === null || s > matched)) matched = s;
  }
  return matched;
}

/** The address an authenticator app reads from the QR code. */
export function otpauthUri(opts: { issuer: string; account: string; secret: string }): string {
  const label = `${encodeURIComponent(opts.issuer)}:${encodeURIComponent(opts.account)}`;
  return `otpauth://totp/${label}?secret=${opts.secret}&issuer=${encodeURIComponent(opts.issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
