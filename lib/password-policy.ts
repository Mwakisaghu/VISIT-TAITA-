// What makes a password acceptable when someone CHOOSES one (sign-up and the reset link). Pure: no database, no network.
// The aim is to stop the passwords attackers try first, without making people's lives hard: length matters most, so a long phrase of unrelated words is welcome.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128; // characters (each Unicode character counts as one, in any script). The password is reduced to a fixed-size digest before it is hashed, so there is no 72-byte limit any more.

export type PasswordCheck = { ok: true } | { ok: false; reason: "short" | "long" | "common" | "repetitive" | "personal" | "breached"; message: string; detail?: "variety" }; // detail tells the two kinds of "repetitive" apart, so each can be shown in the right language

// The passwords (and the words under them) that guessing tools try first, plus words that are common in Kenya and on this site. Matched after lower-casing, undoing letter-for-symbol swaps
// (p@ssw0rd) and removing digits and symbols from the end (password2026!).
const COMMON = new Set(("password passw0rd pass pa55word qwerty qwertyuiop qwerty123 qazwsx asdfgh asdfghjkl zxcvbn zxcvbnm azerty letmein welcome welcome1 admin administrator root login master superuser " +
  "iloveyou iloveu loveyou lovely sunshine princess dragon monkey football soccer baseball basketball arsenal chelsea liverpool manutd manchester barcelona realmadrid superman batman spiderman starwars pokemon " +
  "shadow michael jennifer jessica ashley daniel hunter killer ninja freedom whatever trustno1 abc123 abcdef abcdefgh abcd1234 changeme default secret test testing guest user demo temp temporary " +
  "kenya kenyan nairobi mombasa kisumu nakuru eldoret taita taveta wundanyi voi tsavo mzima visittaita harambee jambo karibu asante mpesa safaricom tusker simba mungu mungu123 baba mama nakupenda nakupendamama nakupendababa mapenzi mpenzi yesu bwana jesus jesus123 godislove nimeokoka pesa kamau wanjiku otieno wafula kipchoge " +
  "1q2w3e4r5t 1qaz2wsx 1qaz2wsx3edc zaq12wsx qazwsxedc zxcvbnm123 asdfghjkl1 qwertyui qwertyuio 1234567890 0987654321 football1 monkey1 dragon1 master1 login1 admin1 hello hello123 helloworld google facebook whatsapp instagram tiktok computer internet samsung iphone secure security private " +
  "summer winter spring autumn january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday").split(/\s+/));
const LEET: Record<string, string> = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
const RUNS = ["qwertyuiopasdfghjklzxcvbnm", "abcdefghijklmnopqrstuvwxyz", "01234567890123456789", "mnbvcxzlkjhgfdsapoiuytrewq", "zyxwvutsrqponmlkjihgfedcba", "98765432109876543210", "12345678901234567890", "09876543210987654321", "1q2w3e4r5t6y7u8i9o0p", "1qaz2wsx3edc4rfv5tgb"];

const base = (p: string) => p.toLowerCase().replace(/[^a-z0-9@$!]/g, "");
const unleet = (p: string) => p.replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
const stripEnd = (p: string) => p.replace(/[0-9!@$#%^&*._-]+$/g, "");

function tooCommon(p: string): boolean {
  const lower = p.toLowerCase().replace(/\s+/g, "");
  const forms = [lower, base(p), unleet(base(p)), stripEnd(lower), unleet(stripEnd(base(p))), stripEnd(unleet(base(p)))];
  return forms.some((f) => f.length > 0 && COMMON.has(f));
}
function repetitive(p: string): boolean {
  const a = p.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(.{1,3})\1+$/.test(a)) return true; // 1111111111, abababababab
  return a.length >= 8 && RUNS.some((r) => r.includes(a)); // 1234567890, qwertyuiop, abcdefghij (and backwards)
}
// Names and addresses are compared in any script (not only a to z), in the canonical Unicode form.
function personal(p: string, ctx: { email?: string; name?: string }): boolean {
  const lower = p.normalize("NFKC").toLowerCase(); const parts: string[] = [];
  if (ctx.email) parts.push(String(ctx.email).normalize("NFKC").toLowerCase().split("@")[0].replace(/[^\p{L}\p{N}]/gu, ""));
  if (ctx.name) parts.push(...String(ctx.name).normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u));
  // A part of a name must be long enough to mean something: 4 characters, or 2 in Chinese, Japanese and Korean, where a whole name is often only 2 or 3 characters.
  return parts.some((x) => Array.from(x).length >= (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(x) ? 2 : 4) && lower.includes(x));
}

const chars = (p: string): number => Array.from(p).length;
function lacksVariety(p: string): boolean { const visible = Array.from(p.replace(/\s/g, "").toLowerCase()); return visible.length < 8 || new Set(visible).size < 5; }

/** The four things a person is shown ticking as they type. `true` means that line is satisfied. Nothing is ticked for an empty password. The verdict below uses exactly these. */
export function passwordChecks(password: unknown, ctx: { email?: string; name?: string } = {}): { length: boolean; common: boolean; personal: boolean; pattern: boolean } {
  const p = typeof password === "string" ? password.normalize("NFKC") : "";
  if (p.length === 0) return { length: false, common: false, personal: false, pattern: false };
  return { length: chars(p) >= PASSWORD_MIN, common: !tooCommon(p), personal: !personal(p, ctx), pattern: !lacksVariety(p) && !repetitive(p) };
}

export function checkPassword(password: unknown, ctx: { email?: string; name?: string } = {}): PasswordCheck {
  if (typeof password !== "string") return { ok: false, reason: "short", message: "Choose a password." };
  const p = password.normalize("NFKC"); // any language, in one canonical form (see lib/password.ts)
  if (chars(p) < PASSWORD_MIN) return { ok: false, reason: "short", message: `Use at least ${PASSWORD_MIN} characters.` };
  if (chars(p) > PASSWORD_MAX) return { ok: false, reason: "long", message: `Use at most ${PASSWORD_MAX} characters.` };
  if (lacksVariety(p)) return { ok: false, reason: "repetitive", detail: "variety", message: "Use more different characters: a short phrase of unrelated words works well." };
  if (tooCommon(p)) return { ok: false, reason: "common", message: "That password is too easy to guess. Try three or four unrelated words, or something only you would know." };
  if (repetitive(p)) return { ok: false, reason: "repetitive", message: "Avoid repeated or sequential characters, like 1111111111 or abcdefghij." };
  if (personal(p, ctx)) return { ok: false, reason: "personal", message: "Your password should not contain your name or email address." };
  return { ok: true };
}
