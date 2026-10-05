import { prisma } from "@/lib/prisma";

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "DECLINED"] as const;
export type EnquiryStatusValue = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
};

export function isEnquiryStatus(value: string): value is EnquiryStatusValue {
  return (ENQUIRY_STATUSES as readonly string[]).includes(value);
}

export type InboxItem = {
  kind: "stay" | "experience";
  id: string;
  listingName: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatusValue;
  createdAt: Date;
  facts: { label: string; value: string }[];
};

function day(d: Date | null): string | null {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
}

/**
 * The enquiries for the listings THIS person owns — and only those. Ownership is part of every query (not a filter
 * applied afterwards), so there is no code path that loads someone else's enquiry. Only what a host needs to reply
 * is selected: no account ids, no referral data.
 */
export async function getInbox(userId: string, status: EnquiryStatusValue | null, limit = 100): Promise<InboxItem[]> {
  const statusFilter = status ? { status } : {};
  const [stays, experiences] = await Promise.all([
    prisma.accommodationEnquiry.findMany({
      where: { accommodation: { ownerId: userId }, ...statusFilter },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, email: true, phone: true, message: true, status: true, createdAt: true, checkIn: true, checkOut: true, guests: true, accommodation: { select: { name: true } } },
    }),
    prisma.experienceEnquiry.findMany({
      where: { experience: { ownerId: userId }, ...statusFilter },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, email: true, phone: true, message: true, status: true, createdAt: true, preferredDate: true, partySize: true, experience: { select: { name: true } } },
    }),
  ]);

  const items: InboxItem[] = [
    ...stays.map((e) => ({
      kind: "stay" as const,
      id: e.id,
      listingName: e.accommodation.name,
      name: e.name,
      email: e.email,
      phone: e.phone,
      message: e.message,
      status: e.status as EnquiryStatusValue,
      createdAt: e.createdAt,
      facts: [
        ...(e.checkIn ? [{ label: "Check-in", value: day(e.checkIn)! }] : []),
        ...(e.checkOut ? [{ label: "Check-out", value: day(e.checkOut)! }] : []),
        ...(e.guests ? [{ label: "Guests", value: String(e.guests) }] : []),
      ],
    })),
    ...experiences.map((e) => ({
      kind: "experience" as const,
      id: e.id,
      listingName: e.experience.name,
      name: e.name,
      email: e.email,
      phone: e.phone,
      message: e.message,
      status: e.status as EnquiryStatusValue,
      createdAt: e.createdAt,
      facts: [
        ...(e.preferredDate ? [{ label: "Preferred date", value: day(e.preferredDate)! }] : []),
        ...(e.partySize ? [{ label: "Party size", value: String(e.partySize) }] : []),
      ],
    })),
  ];
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

/** How many enquiries this person has in each status, across stays and experiences (two grouped queries). */
export async function getInboxCounts(userId: string): Promise<Record<EnquiryStatusValue, number>> {
  const [stays, experiences] = await Promise.all([
    prisma.accommodationEnquiry.groupBy({ by: ["status"], where: { accommodation: { ownerId: userId } }, _count: { _all: true } }),
    prisma.experienceEnquiry.groupBy({ by: ["status"], where: { experience: { ownerId: userId } }, _count: { _all: true } }),
  ]);
  const counts: Record<EnquiryStatusValue, number> = { NEW: 0, CONTACTED: 0, CONFIRMED: 0, DECLINED: 0 };
  for (const g of [...stays, ...experiences]) {
    if (isEnquiryStatus(g.status)) counts[g.status] += g._count._all;
  }
  return counts;
}
