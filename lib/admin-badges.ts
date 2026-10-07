import { prisma } from "@/lib/prisma";
import type { Badges } from "@/lib/admin-nav";

/** Never lets one failing count break the whole admin area: it just shows nothing for that item. */
const safe = (p: Promise<number>) => p.catch(() => 0);

/** How many things are waiting for a person, per kind. Refunds are money, so only admins and super admins get that number. */
export async function loadAdminBadges(manager: boolean): Promise<Badges> {
  const [partners, products, stayEnquiries, experienceEnquiries, reviews, creators, fieldNotes, emails, sponsorLeads, refunds, payouts] = await Promise.all([
    safe(prisma.partnerApplication.count({ where: { status: "PENDING" } })),
    safe(prisma.product.count({ where: { status: "DRAFT", seller: { role: "SELLER" } } })),
    safe(prisma.accommodationEnquiry.count({ where: { status: "NEW" } })),
    safe(prisma.experienceEnquiry.count({ where: { status: "NEW" } })),
    safe(prisma.review.count({ where: { status: "PENDING" } })),
    safe(prisma.creatorApplication.count({ where: { status: "PENDING" } })),
    safe(prisma.fieldNote.count({ where: { status: "PENDING" } })),
    safe(prisma.emailLog.count({ where: { status: { in: ["PENDING", "FAILED"] } } })),
    safe(prisma.sponsorLead.count({ where: { status: "NEW" } })),
    manager ? safe(prisma.bookingRefund.count({ where: { status: { in: ["PENDING", "FAILED"] } } })) : Promise.resolve(0),
    manager ? safe(prisma.hostPayout.count({ where: { status: "PENDING" } })) : Promise.resolve(0),
  ]);
  return { partners, products, stayEnquiries, experienceEnquiries, reviews, creators, fieldNotes, emails, sponsorLeads, refunds, payouts };
}
