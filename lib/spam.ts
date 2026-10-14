// A gentle, accessible defence for public forms. Two cheap checks that a person never notices and a simple bot usually fails:
//   * a HONEYPOT: a field people never see or fill. A bot that fills it gets a normal-looking "success" and nothing is stored (so it learns nothing).
//   * a FILL TIME: the form notes when it appeared; a form "filled" in under 1.5 seconds is not a person. The visitor is asked to try again, kindly.
// Neither blocks anyone who has JavaScript switched off (no timestamp is simply not checked). Per-address rate limits and the database rules stay in place behind these.
export const HONEYPOT_FIELD = "contact_preference_url";
export const STARTED_FIELD = "form_started_at";
export const MIN_FILL_MS = 1500;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SPAM_RETRY = "That was very quick. Please check what you wrote and send it again.";

export type SpamVerdict = { ok: true } | { ok: false; reason: "honeypot" | "too-fast" };
type FormLike = { get(name: string): unknown };

/** `honeypots`: any extra field names this particular form already uses as hidden traps. */
export function spamVerdict(form: FormLike | null | undefined, opts: { honeypots?: string[]; now?: number } = {}): SpamVerdict {
  if (!form || typeof form.get !== "function") return { ok: true };
  const trapped = [HONEYPOT_FIELD, ...(opts.honeypots ?? [])].some((name) => { const v = form.get(name); return typeof v === "string" && v.trim() !== ""; });
  if (trapped) return { ok: false, reason: "honeypot" };
  const raw = form.get(STARTED_FIELD); const started = typeof raw === "string" && /^\d{10,14}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isFinite(started)) return { ok: true }; // no timestamp (no JavaScript, or an old page): not checked
  const now = opts.now ?? Date.now(); const age = now - started;
  if (age < 0 || age > MAX_AGE_MS) return { ok: true }; // a clock that is wrong, or a page left open for days: never punish a person for it
  return age < MIN_FILL_MS ? { ok: false, reason: "too-fast" } : { ok: true };
}

// A small limiter of its own (in memory, per server instance, like the site's other limiter), so this guard works whatever shape the rest of the project is in.
// Returns true if this attempt is allowed, false if `key` has already made `limit` attempts within `windowMs`.
const hits = new Map<string, number[]>();
export function hitLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(key, recent); return false; }
  recent.push(now); hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 24 * 60 * 60 * 1000) hits.delete(k); // keep memory bounded
  return true;
}
