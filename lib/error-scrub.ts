// Everything that turns a raw error report into something safe to keep. An error report must NEVER hold personal data: the visitor did not give it to us, and a stack trace or a message can
// accidentally carry an email address, a phone number, a ticket's secret or a reset link. So it is all removed HERE, before anything is saved, by plain functions that are tested hard.
// (Pure: no database and no network. The browser reporter has its own tiny copy of the few rules it needs.)
import { createHash } from "crypto";

export const LIMITS = { message: 300, stack: 4000, extra: 800, path: 200, kind: 60, payload: 16 * 1024 } as const;
/** Occurrences are kept this many days; an issue nobody has opened, resolved or ignored for this many days is tidied away. (Shown in the privacy policy: a test keeps the two in step.) */
export const EVENT_DAYS = 30;
export const ISSUE_DAYS = 90;

const TRUNC = "\u2026";
const cut = (s: string, max: number) => (s.length > max ? s.slice(0, Math.max(0, max - 1)) + TRUNC : s);

/** Free text (a message, a stack): personal details and secrets replaced by a label, then shortened. */
export function scrubText(input: unknown, max: number): string {
  let s = typeof input === "string" ? input : input == null ? "" : String(input);
  s = s.replace(/\r\n?/g, "\n");
  // ORDER MATTERS: web addresses are dealt with FIRST (everything after a ? or # goes, and a secret in a known address is masked), before any rule that inserts a [label] could confuse them.
  s = s
    .replace(/(https?:\/\/[^\s"'<>)]+?)[?#][^\s"'<>)]*/g, "$1?[query]") // the part of a web address after ? or # can hold anything: keep only that it was there
    .replace(/(\/[\w\-./%@:]*)\?[^\s"'<>)]*/g, "$1?[query]")
    .replace(/\/(checkin|plan|report|verify|cancel-reset|reset-password|invite)\/[^\s/?#"')]+/gi, "/$1/:token") // a secret in the address of a page that carries one
    .replace(/\/(tickets|bookings|orders)\/(?!verify\b|pdf\b)[A-Za-z0-9_-]{6,}/gi, "/$1/:id")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[token]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [token]")
    .replace(/\b(password|passwd|pwd|secret|token|apikey|api_key|auth|authorization|session|cookie|otp|pin)\s*[=:]\s*["']?[^\s"'&,;]+/gi, "$1=[redacted]")
    .replace(/(?:\+?254|\b0)[\s-]?[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, "[phone]") // Kenyan numbers, with or without spaces: +254712345678, 0712345678, 0722 000 111
    .replace(/\+\d[\d\s().-]{8,}\d/g, "[phone]") // other international numbers
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[ip]")
    .replace(/\b\d{13,19}\b/g, "[number]") // card-length numbers
    .replace(/\b(?=[A-Z]*\d)(?=\d*[A-Z])[A-Z0-9]{10}\b/g, "[code]") // an M-Pesa style receipt code
    .replace(/\b(?=[A-Za-z_-]*\d)(?=[0-9_-]*[A-Za-z])[A-Za-z0-9_-]{20,}\b/g, "[token]") // long mixed letters and digits: a token or an id
    .replace(/\b(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{12,19}\b/g, "[token]") // 12 to 19 characters with capitals, small letters AND digits: the shape of a ticket secret. (A random token with NO digit cannot be told from an ordinary camelCase name, so it is not removed from free text: it is kept out of messages at the source, see tests/error_log_test.tsx.)
    .replace(/\b[0-9a-f]{32,}\b/gi, "[token]");
  return cut(s.trim(), max);
}

/** A page address kept only as far as is useful: no host, no query string, no #fragment, and any secret or personal identifier in it masked (a check-in token, a shared plan, a ticket or booking id...). */
export function scrubPath(input: unknown): string {
  let s = typeof input === "string" ? input.trim().slice(0, 600) : "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "").split("#")[0].split("?")[0];
  if (!s.startsWith("/")) s = "/" + s;
  const TOKEN_AFTER = new Set(["checkin", "plan", "report", "verify", "cancel-reset", "reset-password", "invite"]); const ID_AFTER = new Set(["tickets", "bookings", "orders"]);
  const segs = s.split("/"); const out: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]; const prev = (segs[i - 1] ?? "").toLowerCase();
    if (i === 0 || seg === "") { out.push(seg); continue; }
    if (TOKEN_AFTER.has(prev)) out.push(":token");
    else if (ID_AFTER.has(prev) && seg !== "verify" && seg !== "pdf") out.push(":id");
    else if (/@|%40/.test(seg)) out.push(":email");
    else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || /^\d{6,}$/.test(seg) || (/^[A-Za-z0-9_-]{20,}$/.test(seg) && /\d/.test(seg) && /[A-Za-z]/.test(seg))) out.push(":id");
    else out.push(seg.replace(/[^\w\-.~%!$&'()*+,;=:@]/g, "").slice(0, 80));
  }
  return cut(out.join("/") || "/", LIMITS.path);
}

const FRAME = /(?:^|\n)\s*(?:at\s+(?:(.+?)\s+\()?([^\s()]+?):\d+(?::\d+)?\)?|([^\s@]*)@([^\s]+?):\d+(?::\d+)?)\s*(?=\n|$)/;
/** The first line of a stack, reduced to the function and file (no line numbers, no build hash, no query), so the same failure looks the same across builds. */
export function firstFrame(stack: unknown): string {
  const m = FRAME.exec(typeof stack === "string" ? stack : "");
  if (!m) return "";
  const fn = (m[1] ?? m[3] ?? "").trim(); const file = (m[2] ?? m[4] ?? "").split("?")[0].replace(/^[a-z]+:\/\/[^/]*/i, "").replace(/\/_next\/static\/(chunks|[^/]+)\//, "/").replace(/-[0-9a-f]{8,}(?=\.js)/g, "").replace(/[0-9a-f]{16,}/gi, "");
  return `${fn}@${file}`.slice(0, 160);
}

/** The message with the parts that vary left out (numbers, ids), so "Order 17 failed" and "Order 18 failed" are one failure. */
export function normalizeMessage(message: unknown): string {
  return (typeof message === "string" ? message : "").split("\n")[0].replace(/\[[a-z]+\]/g, "[x]").replace(/\b[0-9a-f]{8,}\b/gi, "ID").replace(/\d+/g, "N").replace(/\s+/g, " ").trim().slice(0, 300);
}

/** The same failure always has the same fingerprint (and a different one does not). */
export function fingerprint(source: string, kind: string, message: unknown, stack: unknown): string {
  return createHash("sha256").update(`${source}|${kind}|${normalizeMessage(message)}|${firstFrame(stack)}`).digest("hex").slice(0, 32);
}

/** "Chrome 120 · Android": a family and the major version only. The full browser string identifies a device quite precisely, so it is never kept. */
export function parseBrowser(ua: unknown): string {
  const s = typeof ua === "string" ? ua : ""; if (!s) return "Unknown browser";
  const pick = (re: RegExp) => re.exec(s)?.[1]?.split(".")[0];
  const fam = (name: string, v?: string) => (v ? `${name} ${v}` : name);
  const browser = /Edg(?:e|A|iOS)?\//.test(s) ? fam("Edge", pick(/Edg(?:e|A|iOS)?\/(\d+)/)) : /OPR\/|Opera/.test(s) ? fam("Opera", pick(/OPR\/(\d+)/)) : /SamsungBrowser\//.test(s) ? fam("Samsung Internet", pick(/SamsungBrowser\/(\d+)/)) : /UCBrowser\//.test(s) ? fam("UC Browser", pick(/UCBrowser\/(\d+)/)) : /Firefox\/|FxiOS\//.test(s) ? fam("Firefox", pick(/(?:Firefox|FxiOS)\/(\d+)/)) : /Chrome\/|CriOS\//.test(s) ? fam("Chrome", pick(/(?:Chrome|CriOS)\/(\d+)/)) : /Safari\//.test(s) && /Version\//.test(s) ? fam("Safari", pick(/Version\/(\d+)/)) : "Other browser";
  const os = /Android/.test(s) ? "Android" : /iPhone|iPad|iPod/.test(s) ? "iOS" : /Windows/.test(s) ? "Windows" : /Mac OS X|Macintosh/.test(s) ? "macOS" : /CrOS/.test(s) ? "ChromeOS" : /Linux/.test(s) ? "Linux" : "";
  return os ? `${browser} \u00b7 ${os}` : browser;
}

/** Search engines, link previews, uptime checkers and automated browsers: their JavaScript failures are not about real visitors. */
export const isBot = (ua: unknown): boolean => /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|headless|lighthouse|pagespeed|gtmetrix|uptime|monitor|curl\/|wget|python-requests|node-fetch|axios/i.test(typeof ua === "string" ? ua : "");

/** Failures that say nothing about OUR site: a browser quirk, an extension, a cancelled request. Dropped, not logged. */
export function isNoise(message: unknown, stack: unknown): boolean {
  const m = typeof message === "string" ? message : ""; const st = typeof stack === "string" ? stack : "";
  return /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection captured|The operation was aborted|AbortError|The user aborted a request|cancelled$|NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING/i.test(m) || /(?:chrome|moz|safari|ms-browser)-extension:\/\//i.test(st) || /extensions?\//.test(st.split("\n")[0] ?? "");
}

export type CleanReport = { source: "BROWSER" | "SERVER"; kind: string; message: string; stack: string | null; extra: string | null; path: string; route: string | null; method: string | null; digest: string | null; browser: string; signedIn: boolean; release: string | null; locale: string | null };

/** The report a browser sent, checked and cleaned (or null when it is not a report at all). The browser's user agent and the signed-in flag come from the REQUEST, never from the report, so a report cannot lie about them. */
export function sanitizeBrowserReport(raw: unknown, ctx: { userAgent: string; signedIn: boolean; release: string | null }): CleanReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.message !== "string" || r.message.trim() === "") return null;
  if (isNoise(r.message, r.stack)) return null;
  const kind = scrubText(typeof r.kind === "string" ? r.kind : "error", LIMITS.kind).replace(/[^\w .:/-]/g, "") || "error";
  const locale = typeof r.locale === "string" && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(r.locale) ? r.locale : null;
  return {
    source: "BROWSER", kind, message: scrubText(r.message.split("\n")[0], LIMITS.message), stack: typeof r.stack === "string" && r.stack ? scrubText(r.stack, LIMITS.stack) : null,
    extra: typeof r.extra === "string" && r.extra ? scrubText(r.extra, LIMITS.extra) : null, path: scrubPath(r.path), route: scrubPath(r.path), method: null,
    digest: typeof r.digest === "string" && /^[\w-]{3,40}$/.test(r.digest) ? r.digest : null, browser: parseBrowser(ctx.userAgent), signedIn: ctx.signedIn, release: ctx.release, locale,
  };
}
