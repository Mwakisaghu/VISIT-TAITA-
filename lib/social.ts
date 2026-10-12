import { toWhatsAppNumber } from "@/lib/enquiry-contact";

// Social links for the whole site, from environment variables. Nothing is shown (and no dead link is rendered) until they are set.
//   INSTAGRAM_HANDLE   "visittaita", "@visittaita" or a profile URL
//   WHATSAPP_NUMBER    any common format: 0712 345 678, +254 712 345 678, 254712345678
//   WHATSAPP_MESSAGE   (optional) the message a visitor's chat starts with
//   FACEBOOK_URL       "visittaita" or the page address, e.g. https://www.facebook.com/visittaita
//   TIKTOK_HANDLE      "visittaita", "@visittaita" or https://www.tiktok.com/@visittaita
//   YOUTUBE_URL        "@visittaita" or the channel address, e.g. https://www.youtube.com/@visittaita
//   X_HANDLE           "visittaita", "@visittaita" or https://x.com/visittaita (twitter.com works too)
// Every link is REBUILT from a checked name, so whatever is typed into a setting can never become a different address.

export type SocialLinks = {
  instagram: { handle: string; url: string } | null;
  whatsapp: { number: string; display: string; link: (message?: string) => string } | null;
  facebook: { name: string; url: string } | null;
  tiktok: { handle: string; url: string } | null;
  youtube: { label: string; url: string } | null;
  x: { handle: string; url: string } | null;
};

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
// Instagram URLs that are not profiles
const RESERVED = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "about", "web", "developer"]);

/** "visittaita", "@visittaita" or "https://www.instagram.com/visittaita/?igsh=…" -> "visittaita"; anything else -> null. */
export function parseInstagramHandle(raw: string | undefined | null): string | null {
  let v = String(raw ?? "").trim();
  if (!v) return null;
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i.exec(v);
  if (fromUrl) v = fromUrl[1];
  v = v.replace(/^@/, "");
  if (!HANDLE.test(v) || RESERVED.has(v.toLowerCase())) return null;
  return v;
}

/** "254712345678" -> "+254 712 345 678"; other countries -> "+<digits>". */
export function displayNumber(digits: string): string {
  return /^254\d{9}$/.test(digits) ? `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}` : `+${digits}`;
}

const fromUrl = (raw: string, hosts: RegExp) => { const m = new RegExp("^(?:https?:\\/\\/)?(?:www\\.|m\\.)?(?:" + hosts.source + ")\\/([^?#\\s]*)", "i").exec(raw); return m ? m[1].replace(/\/+$/, "") : null; };
const clean = (raw: string | undefined | null) => String(raw ?? "").trim();

/** "visittaita" or "https://www.facebook.com/visittaita/" -> "visittaita". Share links, dialogs and profile.php are not pages: null. */
export function parseFacebookName(raw: string | undefined | null): string | null {
  let v = clean(raw); if (!v) return null; const u = fromUrl(v, /facebook\.com|fb\.com/); if (u !== null) v = u.split("/")[0];
  v = v.replace(/^@/, ""); const bad = new Set(["sharer", "sharer.php", "share", "dialog", "plugins", "login", "login.php", "profile.php", "groups", "events", "watch", "marketplace", "pages", "people", "hashtag", "help", "policies", "legal", "l.php", "tr"]);
  return /^[A-Za-z0-9.]{5,50}$/.test(v) && !bad.has(v.toLowerCase()) ? v : null;
}
/** "@visittaita", "visittaita" or "https://www.tiktok.com/@visittaita" -> "visittaita". */
export function parseTikTokHandle(raw: string | undefined | null): string | null {
  let v = clean(raw); if (!v) return null; const u = fromUrl(v, /tiktok\.com/); if (u !== null) v = u.split("/")[0];
  v = v.replace(/^@/, ""); return /^[A-Za-z0-9._]{2,24}$/.test(v) && !v.endsWith(".") ? v : null;
}
/** "visittaita", "@visittaita", "https://x.com/visittaita" or twitter.com -> "visittaita". */
export function parseXHandle(raw: string | undefined | null): string | null {
  let v = clean(raw); if (!v) return null; const u = fromUrl(v, /x\.com|twitter\.com/); if (u !== null) v = u.split("/")[0];
  v = v.replace(/^@/, ""); const bad = new Set(["home", "i", "intent", "share", "search", "hashtag", "login", "explore", "settings", "messages", "notifications", "compose"]);
  return /^[A-Za-z0-9_]{1,15}$/.test(v) && !bad.has(v.toLowerCase()) ? v : null;
}
/** "@visittaita", "https://www.youtube.com/@visittaita", /channel/UC… or /c/name -> a checked channel address and a label; anything else null. */
export function parseYouTube(raw: string | undefined | null): { label: string; url: string } | null {
  const v = clean(raw); if (!v) return null; const u = fromUrl(v, /youtube\.com/); const path = u !== null ? u : v;
  const h = /^@([A-Za-z0-9._-]{3,30})$/.exec(path); if (h) return { label: "@" + h[1], url: `https://www.youtube.com/@${h[1]}` };
  const ch = /^channel\/(UC[A-Za-z0-9_-]{20,24})$/.exec(path); if (ch) return { label: "our channel", url: `https://www.youtube.com/channel/${ch[1]}` };
  const c = /^(?:c|user)\/([A-Za-z0-9._-]{2,40})$/.exec(path); if (c) return { label: c[1], url: `https://www.youtube.com/c/${c[1]}` };
  return u === null && /^[A-Za-z0-9._-]{3,30}$/.test(v) ? { label: "@" + v, url: `https://www.youtube.com/@${v}` } : null;
}

const DEFAULT_MESSAGE = "Hello Visit Taita! I have a question.";

export function readSocial(env: Record<string, string | undefined> = process.env): SocialLinks {
  const handle = parseInstagramHandle(env.INSTAGRAM_HANDLE);
  const number = toWhatsAppNumber(env.WHATSAPP_NUMBER ?? "");
  const message = (env.WHATSAPP_MESSAGE ?? "").trim() || DEFAULT_MESSAGE;
  const fb = parseFacebookName(env.FACEBOOK_URL), tt = parseTikTokHandle(env.TIKTOK_HANDLE), xh = parseXHandle(env.X_HANDLE), yt = parseYouTube(env.YOUTUBE_URL);
  return {
    instagram: handle ? { handle, url: `https://www.instagram.com/${handle}/` } : null,
    whatsapp: number ? { number, display: displayNumber(number), link: (m?: string) => `https://wa.me/${number}?text=${encodeURIComponent((m ?? message).slice(0, 500))}` } : null,
    facebook: fb ? { name: fb, url: `https://www.facebook.com/${fb}` } : null,
    tiktok: tt ? { handle: tt, url: `https://www.tiktok.com/@${tt}` } : null,
    youtube: yt,
    x: xh ? { handle: xh, url: `https://x.com/${xh}` } : null,
  };
}
