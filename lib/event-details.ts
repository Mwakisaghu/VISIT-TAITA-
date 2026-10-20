// The optional "more details" of an event: the longer description, a programme, what is included, what to bring, how to get there, access, and a contact.
// Pure functions, so the page, the admin form and the tests all agree on what counts as "filled in" and how the free text is read.
export const DETAIL_FIELDS = ["details", "programme", "included", "bring", "gettingThere", "accessibility", "contact"] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];
export type EventDetails = Partial<Record<DetailField, string | null | undefined>>;

/** The longest each may be (characters). Generous for a description, tight for a contact line. */
export const DETAIL_MAX: Record<DetailField, number> = { details: 4000, programme: 2000, included: 1500, bring: 1500, gettingThere: 2000, accessibility: 1500, contact: 500 };

/** What an admin typed, tidied: Windows line breaks made plain, trailing spaces and runs of blank lines removed, and nothing at all (or only spaces) stored as null. */
export function cleanDetail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+$/g, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return t === "" ? null : t;
}

/** The lines of a list, without bullets or empty lines ("- tea", "• tea" and "* tea" all read as "tea"). */
export const detailLines = (text: string | null | undefined): string[] => cleanDetail(text)?.split("\n").map((l) => l.replace(/^\s*(?:[-*\u2022\u2013]\s+)/, "").trim()).filter(Boolean) ?? [];

/** Paragraphs: blocks separated by a blank line; a single line break inside a block is kept as a line break by the page. */
export const detailParagraphs = (text: string | null | undefined): string[] => cleanDetail(text)?.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) ?? [];

export type ProgrammeItem = { time: string | null; text: string };
const TIME = /^\d{1,2}[:.]\d{2}\s*(?:am|pm)?$/i;
/** "08:00 | Gates open" -> { time: "08:00", text: "Gates open" }. A line without a time before the bar is just text. Only the FIRST bar separates, so the text may contain bars. */
export function parseProgramme(text: string | null | undefined): ProgrammeItem[] {
  return detailLines(text).map((l) => { const i = l.indexOf("|"); if (i > 0) { const time = l.slice(0, i).trim(), rest = l.slice(i + 1).trim(); if (TIME.test(time) && rest) return { time: time.replace(".", ":"), text: rest }; } return { time: null, text: l }; });
}

/** Does this event have anything to show under "Show more details"? */
export const hasMoreDetails = (e: EventDetails): boolean => DETAIL_FIELDS.some((k) => cleanDetail(e[k]) !== null);
