import { toWhatsAppNumber } from "@/lib/enquiry-contact";

// Instagram and WhatsApp for the whole site, from two environment variables. Nothing is shown (and no dead link is rendered)
// until they are set.
//   INSTAGRAM_HANDLE   "visittaita", "@visittaita" or a profile URL
//   WHATSAPP_NUMBER    any common format: 0712 345 678, +254 712 345 678, 254712345678
//   WHATSAPP_MESSAGE   (optional) the message a visitor's chat starts with

export type SocialLinks = {
  instagram: { handle: string; url: string } | null;
  whatsapp: { number: string; display: string; link: (message?: string) => string } | null;
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

const DEFAULT_MESSAGE = "Hello Visit Taita! I have a question.";

export function readSocial(env: Record<string, string | undefined> = process.env): SocialLinks {
  const handle = parseInstagramHandle(env.INSTAGRAM_HANDLE);
  const number = toWhatsAppNumber(env.WHATSAPP_NUMBER ?? "");
  const message = (env.WHATSAPP_MESSAGE ?? "").trim() || DEFAULT_MESSAGE;
  return {
    instagram: handle ? { handle, url: `https://www.instagram.com/${handle}/` } : null,
    whatsapp: number ? { number, display: displayNumber(number), link: (m?: string) => `https://wa.me/${number}?text=${encodeURIComponent((m ?? message).slice(0, 500))}` } : null,
  };
}
