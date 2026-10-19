// Is this password known to have leaked in a data breach? NIST asks sites to refuse such passwords. It uses the free "Pwned Passwords" service (Have I Been Pwned) in a way that never reveals the password:
// only the first FIVE characters of the password's SHA-1 fingerprint are sent, and the answer is a list of fingerprints that start the same way, which we check here.
// The service is a convenience, never a gate: if it is slow, down or confused, the password is simply accepted (a sign-up must never fail because someone else's website is having a bad day).
import { createHash } from "node:crypto";
import { normalizePassword } from "@/lib/password";

export type PwnedOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };
export async function isPwned(password: string, { fetchImpl = fetch, timeoutMs = 2500 }: PwnedOptions = {}): Promise<boolean> {
  const sha1 = createHash("sha1").update(normalizePassword(password), "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5), suffix = sha1.slice(5);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" }, signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return false;
    for (const line of (await res.text()).split("\n")) { const [s, count] = line.trim().split(":"); if (s === suffix && Number(count) > 0) return true; } // padded fake lines have a count of 0
    return false;
  } catch { return false; } finally { clearTimeout(timer); }
}
