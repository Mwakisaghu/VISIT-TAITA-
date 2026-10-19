import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

// One place that decides how passwords are stored and checked.
//
// A password is first put into ONE canonical form (Unicode NFKC) and reduced to a fixed-size SHA-256 digest, and only then hashed with bcrypt. Two reasons, both about people who write in their own language:
//  * the same letter can be typed two ways (é as one character, or as "e" plus an accent), and different phones and computers produce different ones. Without a canonical form a password set on one
//    device would not work on another. NFKC is what NIST SP 800-63B recommends.
//  * bcrypt only reads the first 72 BYTES. Scripts such as Amharic, Arabic or Chinese use 2 to 3 bytes a character, so they were limited to roughly 24 to 36 characters while English got 72. A fixed-size
//    digest removes the limit for everyone.
// Hashes made this way start with "v2$". Older ones (plain bcrypt) still work and are upgraded the next time their owner signs in, with the password they have just typed correctly (see lib/auth.ts).
// Cost 12 means each guess costs an attacker about four times what cost 10 did (a sign-in takes roughly a quarter of a second).
export const BCRYPT_COST = 12;
const V2 = "v2$";

/** The one canonical form of a password. */
export const normalizePassword = (password: string): string => password.normalize("NFKC");
const digest = (password: string): string => createHash("sha256").update(normalizePassword(password), "utf8").digest("base64"); // 44 characters, safely under bcrypt's 72-byte reading limit

export const hashPassword = async (password: string): Promise<string> => V2 + (await bcrypt.hash(digest(password), BCRYPT_COST));

/** Whether a typed password matches a stored hash, whichever way the hash was made. */
export async function verifyPassword(password: unknown, hash: unknown): Promise<boolean> {
  if (typeof password !== "string" || typeof hash !== "string" || password.length === 0 || hash.length === 0) return false;
  if (hash.startsWith(V2)) return bcrypt.compare(digest(password), hash.slice(V2.length));
  // An older hash: it was made from the password exactly as typed. A password set on a device that wrote it in a different Unicode form (composed or decomposed accents) is tried in both forms as well.
  // Plain ASCII passwords have no other form, so they cost one comparison, as before.
  if (await bcrypt.compare(password, hash)) return true;
  for (const other of new Set([password.normalize("NFKC"), password.normalize("NFKD")])) if (other !== password && (await bcrypt.compare(other, hash))) return true;
  return false;
}

/** The cost a stored bcrypt hash was made with, or null if it does not look like one. */
export function bcryptCost(hash: unknown): number | null {
  const h = typeof hash === "string" ? (hash.startsWith(V2) ? hash.slice(V2.length) : hash) : "";
  const m = /^\$2[abxy]\$(\d{2})\$/.exec(h);
  return m ? Number(m[1]) : null;
}
/** True for a hash in the older format, or made at a lower cost: it is replaced at the owner's next successful sign-in. */
export const needsRehash = (hash: unknown): boolean => { const c = bcryptCost(hash); if (c === null) return false; return typeof hash === "string" && !hash.startsWith(V2) ? true : c < BCRYPT_COST; };
