// Who is behind the site, for the legal pages. Everything comes from environment variables, so no legal detail is
// ever guessed or hard-coded: a missing value shows up on the page as "[to be completed]" until you set it.

/** Bump when the Privacy Policy or Terms change materially. Stored with each account's acceptance. */
export const LEGAL_VERSION = "2026-10";

export const TO_COMPLETE = "[to be completed]";

export type SiteInfo = {
  /** The registered legal name of the organisation that controls the data. */
  legalName: string | null;
  contactEmail: string | null;
  /** Where privacy requests go. Falls back to the contact email. */
  privacyEmail: string | null;
  phone: string | null;
  address: string | null;
  /** The Office of the Data Protection Commissioner registration number, once you have one. */
  odpcRegistration: string | null;
  /** The date a lawyer approved this text (YYYY-MM-DD). Until it is set, the pages say they are a draft. */
  reviewedOn: Date | null;
};

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

export function readSiteInfo(env: Record<string, string | undefined> = process.env): SiteInfo {
  const contactEmail = clean(env.CONTACT_EMAIL);
  let reviewedOn: Date | null = null;
  const raw = clean(env.LEGAL_REVIEWED_ON);
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) reviewedOn = d;
  }
  return {
    legalName: clean(env.SITE_LEGAL_NAME),
    contactEmail,
    privacyEmail: clean(env.PRIVACY_EMAIL) ?? contactEmail,
    phone: clean(env.CONTACT_PHONE),
    address: clean(env.CONTACT_ADDRESS),
    odpcRegistration: clean(env.ODPC_REGISTRATION_NUMBER),
    reviewedOn,
  };
}

export function orPlaceholder(value: string | null | undefined): string {
  return value && value.trim() ? value : TO_COMPLETE;
}

/** The name to use for "we" in the legal text. */
export function controllerName(info: SiteInfo): string {
  return info.legalName ?? "Visit Taita";
}

export function formatLegalDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
