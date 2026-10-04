// Pure rules for Field Crew missions (no Node-only imports, so safe in client components).

export const MISSION_LIMITS = {
  titleMin: 4,
  titleMax: 100,
  summaryMin: 10,
  summaryMax: 200,
  briefMin: 50,
  briefMax: 3000,
  campaignMax: 80,
  promptMax: 120,
  maxPrompts: 8,
  supportNoteMax: 300,
  hostNameMax: 100,
  rewardPointsMax: 1000,
  maxCreatorsMax: 50,
} as const;

/** How many missions one creator can hold at once, so a few people can't sit on every spot. */
export const MAX_ACTIVE_CLAIMS = 3;

export const MISSION_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export type MissionStatusValue = (typeof MISSION_STATUSES)[number];
export const MISSION_STATUS_LABELS: Record<MissionStatusValue, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

export const MISSION_SUPPORTS = ["NONE", "HOSTED", "SPONSORED"] as const;
export type MissionSupportValue = (typeof MISSION_SUPPORTS)[number];
export const MISSION_SUPPORT_LABELS: Record<MissionSupportValue, string> = {
  NONE: "Independent",
  HOSTED: "Hosted",
  SPONSORED: "Sponsored",
};
export const MISSION_SUPPORT_HELP: Record<MissionSupportValue, string> = {
  NONE: "No one provides anything to the creator — nothing to disclose.",
  HOSTED: "A partner provides something (a stay, meals, a guide). Creators must disclose it.",
  SPONSORED: "A sponsor funds the mission. Creators must disclose it.",
};

export function missionStatusLabel(s: string) {
  return MISSION_STATUS_LABELS[s as MissionStatusValue] ?? s;
}
export function missionSupportLabel(s: string) {
  return MISSION_SUPPORT_LABELS[s as MissionSupportValue] ?? s;
}

/**
 * The line a creator pastes into their own post for a hosted or sponsored mission.
 * It is a SUGGESTION to make disclosure the easy default — it isn't legal advice.
 * Independent missions need none.
 */
export function disclosureLine(m: {
  support: string;
  hostName: string | null;
  sponsorName: string | null;
}): string | null {
  if (m.support === "HOSTED" && m.hostName) return `Hosted by ${m.hostName} through Visit Taita. #ad`;
  if (m.support === "SPONSORED" && m.sponsorName) return `In partnership with ${m.sponsorName} through Visit Taita. #ad`;
  return null;
}

export type MissionUnavailable = "draft" | "closed" | "expired" | "full";

/** Whether a mission can currently be claimed (before eligibility and personal limits). */
export function missionAvailability(
  m: { status: string; closesAt: Date | null; maxCreators: number | null; spotsTaken: number },
  now: Date = new Date()
): { open: true } | { open: false; reason: MissionUnavailable } {
  if (m.status === "DRAFT") return { open: false, reason: "draft" };
  if (m.status !== "OPEN") return { open: false, reason: "closed" };
  if (m.closesAt && m.closesAt.getTime() <= now.getTime()) return { open: false, reason: "expired" };
  if (m.maxCreators !== null && m.spotsTaken >= m.maxCreators) return { open: false, reason: "full" };
  return { open: true };
}

export const UNAVAILABLE_MESSAGES: Record<MissionUnavailable, string> = {
  draft: "This mission isn't available.",
  closed: "This mission is closed.",
  expired: "This mission's deadline has passed.",
  full: "All the spots on this mission have been taken.",
};

/** Spots remaining, or null when there's no cap. */
export function spotsLeft(m: { maxCreators: number | null; spotsTaken: number }): number | null {
  return m.maxCreators === null ? null : Math.max(0, m.maxCreators - m.spotsTaken);
}

/** A mission with no track is open to both. */
export function isEligibleTrack(missionTrack: string | null, creatorTrack: string) {
  return missionTrack === null || missionTrack === creatorTrack;
}

/** One evidence prompt per line. Blank lines and repeats are dropped. */
export function parsePrompts(raw: string): { prompts: string[]; error?: string } {
  const prompts: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim().replace(/\s+/g, " ");
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    if (text.length > MISSION_LIMITS.promptMax) {
      return { prompts: [], error: `Keep each prompt under ${MISSION_LIMITS.promptMax} characters.` };
    }
    seen.add(key);
    prompts.push(text);
  }
  if (prompts.length > MISSION_LIMITS.maxPrompts) {
    return { prompts: [], error: `Use at most ${MISSION_LIMITS.maxPrompts} prompts.` };
  }
  return { prompts };
}

/** "Mon 5 Oct" style deadline label. */
export function formatDeadline(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
