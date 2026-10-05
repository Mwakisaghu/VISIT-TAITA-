// Referral links: how an enquiry knows it began on a mission page or one of its Field Notes.
// Pure (no Node-only imports), so it is safe in client components too.

export type Referral = { kind: "note" | "mission"; slug: string };

// "note:sunrise--amina" / "mission:sunrise". Slugs are lower-case letters, digits and hyphens; a note slug
// joins its mission and creator with a double hyphen. Anything else — upper case, spaces, other schemes,
// other characters — is not a referral.
const PATTERN = /^(note|mission):([a-z0-9]+(?:-{1,2}[a-z0-9]+)*)$/;
const MAX_LENGTH = 160;

/** Reads the `from` value. Returns null for anything that isn't exactly a valid referral. */
export function parseReferral(raw: string | null | undefined): Referral | null {
  const text = String(raw ?? "").trim();
  if (text.length === 0 || text.length > MAX_LENGTH) return null;
  const match = PATTERN.exec(text);
  if (!match) return null;
  return { kind: match[1] as Referral["kind"], slug: match[2] };
}

export function referralValue(ref: Referral) {
  return `${ref.kind}:${ref.slug}`;
}

/** A listing link that carries where the visitor came from, e.g. /stay/listing/dawida?from=note%3Asunrise--amina */
export function listingHref(listingPath: string, ref: Referral) {
  return `${listingPath}?from=${encodeURIComponent(referralValue(ref))}`;
}
