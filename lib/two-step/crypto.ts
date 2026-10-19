// The two-step secret is encrypted before it is stored, so a copy of the database alone is not enough to make anyone's codes. The key lives in TWO_FACTOR_KEY (a setting, never in the code or the database).
// IF THE KEY IS LOST OR CHANGED, every secret and every recovery code stops working and people have to be reset by hand: keep a safe copy of it.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/** The key, from 32 random bytes written as base64 or as 64 hex characters; null if it is missing or the wrong size (so the feature stays OFF rather than running with a weak key). */
export function loadKey(raw: string | undefined = process.env.TWO_FACTOR_KEY): Buffer | null {
  const v = (raw ?? "").trim(); if (!v) return null;
  if (/^[0-9a-fA-F]{64}$/.test(v)) return Buffer.from(v, "hex");
  try { const b = Buffer.from(v, "base64"); return b.length === 32 && b.toString("base64").replace(/=+$/, "") === v.replace(/=+$/, "") ? b : null; } catch { return null; }
}
export const twoStepAvailable = (raw?: string): boolean => loadKey(raw ?? process.env.TWO_FACTOR_KEY) !== null;

const b64 = (b: Buffer) => b.toString("base64url");
/** "v1.<nonce>.<tag>.<ciphertext>": authenticated encryption (AES-256-GCM), so a tampered value is detected rather than decrypted to nonsense. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key, iv); const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", b64(iv), b64(c.getAuthTag()), b64(ct)].join(".");
}
/** The secret, or null for ANY problem (wrong key, damaged, not ours). */
export function decryptSecret(blob: string, key: Buffer): string | null {
  try {
    const [v, iv, tag, ct] = String(blob).split("."); if (v !== "v1" || !iv || !tag || !ct) return null;
    const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url")); d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch { return null; }
}
/** A keyed fingerprint (so a recovery code is stored as something only we can recompute). `label` keeps one purpose's fingerprints from matching another's. */
export const keyedHash = (label: string, value: string, key: Buffer): string => createHmac("sha256", key).update(`${label}\u0000${value}`).digest("hex");
