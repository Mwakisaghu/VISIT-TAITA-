import bcrypt from "bcryptjs";

// One place that decides how passwords are stored. Cost 12 means each guess costs an attacker about four times what cost 10 did (a sign-in takes roughly a quarter of a second).
// Passwords stored at a lower cost are upgraded the next time their owner signs in, with the password they have just typed correctly (see lib/auth.ts).
export const BCRYPT_COST = 12;
export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_COST);

/** The cost a stored bcrypt hash was made with, or null if it does not look like one. */
export function bcryptCost(hash: unknown): number | null {
  const m = /^\$2[abxy]\$(\d{2})\$/.exec(typeof hash === "string" ? hash : "");
  return m ? Number(m[1]) : null;
}
export const needsRehash = (hash: unknown): boolean => { const c = bcryptCost(hash); return c !== null && c < BCRYPT_COST; };
