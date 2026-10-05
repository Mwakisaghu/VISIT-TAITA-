// Contact links for an enquirer (pure: no Node-only imports, safe anywhere).
// All of these return null rather than guessing: a wrong link would send a host to the wrong person.

export function firstName(name: string): string {
  return String(name ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * The number in the form WhatsApp's wa.me expects (digits only, with country code), or null if it isn't clearly a
 * real number. Accepts Kenyan local formats (0712 345 678, 0112345678, 712345678), 254… with or without "+", and any
 * other international number written with + or 00. Landlines and anything ambiguous give null.
 */
export function toWhatsAppNumber(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const international = text.startsWith("+") || text.startsWith("00");
  let digits = text.replace(/\D/g, "");
  if (text.startsWith("00")) digits = digits.slice(2);

  if (international) {
    // Kenyan numbers are written "+254 (0)712…" a lot; the (0) must be dropped. Anything else on 254 must be exactly 12 digits.
    if (digits.startsWith("254")) {
      if (/^2540[17]\d{8}$/.test(digits)) return `254${digits.slice(4)}`;
      return /^254[17]\d{8}$/.test(digits) ? digits : null;
    }
    return /^[1-9]\d{7,14}$/.test(digits) ? digits : null; // E.164: 8–15 digits, no leading 0
  }

  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`; // 07xx… / 01xx…
  if (/^254[17]\d{8}$/.test(digits)) return digits; // 2547xx… written without the +
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`; // 7xx… (leading 0 dropped)
  return null;
}

/** A tel: link carrying only digits and an optional leading +, or null if there aren't enough digits to be a number. */
export function telHref(raw: string): string | null {
  const text = String(raw ?? "").trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${text.startsWith("+") ? "+" : ""}${digits}`;
}

export function whatsappHref(raw: string, message: string): string | null {
  const number = toWhatsAppNumber(raw);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

// Deliberately strict. An enquirer chooses their own address, and in a mailto: link the characters ? & = % # change what the
// link DOES (for example "a?cc=x@evil.co" would silently copy a stranger into the host's reply). So only plain addresses get
// a link; anything else is still shown as text and the host can use the phone or WhatsApp instead.
const EMAIL_RE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** A mailto: link, or null for an address that isn't a plain valid one. The subject can never carry a line break. */
export function mailtoHref(opts: { to: string; subject: string; body: string }): string | null {
  const to = String(opts.to ?? "").trim();
  if (to.length > 254 || !EMAIL_RE.test(to)) return null;
  const subject = String(opts.subject ?? "").replace(/[\r\n]+/g, " ").trim();
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(String(opts.body ?? ""))}`;
}

export const REPLY_TEMPLATES = {
  email: (guest: string, listing: string) => ({
    subject: `Re: your enquiry about ${listing}`,
    body: `Hi ${firstName(guest)},\n\nThanks for your enquiry about ${listing} through Visit Taita.\n\n`,
  }),
  whatsapp: (guest: string, listing: string) => `Hi ${firstName(guest)}, this is ${listing} replying to your enquiry on Visit Taita.`,
};
