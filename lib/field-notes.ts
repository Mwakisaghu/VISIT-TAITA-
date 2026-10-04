// Pure rules for Field Notes (no Node-only imports, so safe in client components).

export const NOTE_LIMITS = {
  titleMin: 4,
  titleMax: 100,
  answerMin: 10,
  answerMax: 600,
  bodyMax: 3000,
  bodyMinWithoutPrompts: 100,
  maxPhotos: 6,
  maxLinks: 5,
  reasonMax: 500,
} as const;

/** App servers and the database can disagree by a moment; a check-in made right after claiming must still count. */
export const CLOCK_SKEW_MS = 5000;

export const NOTE_STATUSES = ["PENDING", "APPROVED", "CHANGES_REQUESTED", "HIDDEN"] as const;
export type NoteStatusValue = (typeof NOTE_STATUSES)[number];
export const NOTE_STATUS_LABELS: Record<NoteStatusValue, string> = {
  PENDING: "Awaiting review",
  APPROVED: "Published",
  CHANGES_REQUESTED: "Changes requested",
  HIDDEN: "Hidden",
};
export function noteStatusLabel(s: string) {
  return NOTE_STATUS_LABELS[s as NoteStatusValue] ?? s;
}

/** "<mission-slug>--<creator-slug>". Slugs never contain "--", so two different pairs can never collide. */
export function noteSlug(missionSlug: string, creatorSlug: string) {
  return `${missionSlug}--${creatorSlug}`;
}

export function methodLabel(method: string) {
  return method === "QR" ? "QR code" : method === "LOCATION" ? "GPS" : method;
}

/**
 * The proof behind "Verified on location": a QR or GPS check-in at the mission's place made
 * AFTER the creator claimed the mission. A self-reported visit ("I've been here") is not proof,
 * and neither is a check-in made before claiming — otherwise one old visit could back any note.
 */
export function isVerifiedFor(
  visit: { method: string; lastVerifiedAt: Date | null } | null,
  claimedAt: Date
): boolean {
  if (!visit || visit.method === "SELF_REPORTED" || !visit.lastVerifiedAt) return false;
  return visit.lastVerifiedAt.getTime() >= claimedAt.getTime() - CLOCK_SKEW_MS;
}

export function formatNoteDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
