// Shared constants and labels for the sponsorship module.

export const SPONSOR_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
] as const;

export type SponsorLeadStatusValue = (typeof SPONSOR_LEAD_STATUSES)[number];

const LEAD_STATUS_LABELS: Record<SponsorLeadStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal sent",
  WON: "Won",
  LOST: "Lost",
};

export function sponsorLeadStatusLabel(status: string) {
  return LEAD_STATUS_LABELS[status as SponsorLeadStatusValue] ?? status;
}

// Event programmes a sponsor can be shown against (matches EventProgram).
export const SPONSOR_PROGRAMS = [
  { key: "TAITA_CUP", label: "Taita Cup" },
  { key: "TAITA_WEEK", label: "Taita Week" },
  { key: "TAITA_SOUND", label: "Taita Sound" },
] as const;

export type SponsorProgramValue = (typeof SPONSOR_PROGRAMS)[number]["key"];
