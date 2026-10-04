import { randomInt } from "node:crypto";

// No 0/O/1/I so a code read out over the phone or copied from a screenshot
// can't be misread.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. "TAITA-K7M2QX". 32^6 ≈ 1 billion possibilities; uniqueness is also enforced by the database. */
export function generateVoucherCode() {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `TAITA-${suffix}`;
}
