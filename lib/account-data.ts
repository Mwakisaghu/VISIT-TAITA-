import { ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Reasons an account can't be deleted in one click yet. An empty list means it can. Shown on the account page and
 * enforced by the deletion action, so the two can never disagree.
 */
export async function getDeletionBlockers(user: { id: string; role: string }): Promise<string[]> {
  const reasons: string[] = [];

  if (ADMIN_ROLES.includes(user.role)) {
    reasons.push("Staff accounts are removed by another administrator, so the site is never left without one. Please ask one of them.");
  }

  const [stays, experiences, products, rewards, openOrders] = await Promise.all([
    prisma.accommodation.count({ where: { ownerId: user.id } }),
    prisma.experience.count({ where: { ownerId: user.id } }),
    prisma.product.count({ where: { sellerId: user.id } }),
    prisma.reward.count({ where: { ownerId: user.id } }),
    prisma.order.count({
      where: { buyerId: user.id, OR: [{ status: { in: ["PENDING", "CONFIRMED"] } }, { paymentStatus: "PENDING" }] },
    }),
  ]);

  if (stays + experiences + products + rewards > 0) {
    reasons.push("Your account manages listings, products or rewards. Contact us to transfer or remove them first, so they aren't left without an owner.");
  }
  if (openOrders > 0) {
    reasons.push("You have an order in progress. You can delete your account once it has been completed or cancelled.");
  }
  return reasons;
}

/**
 * Everything the platform holds about this person that is linked to their account, as a plain object ready to be
 * downloaded as JSON. Deliberately NOT included: the password (only a one-way hash exists), our team's internal
 * notes, and other people's data. Data that isn't linked to an account is handled by a request to us, because
 * accounts are not email-verified and matching on an email address could expose someone else's details.
 */
export async function buildAccountExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, points: true, createdAt: true, termsAcceptedAt: true, termsVersion: true, emailVerifiedAt: true },
  });
  if (!user) return null;

  const [visits, points, badges, vouchers, reviews, stayEnq, expEnq, orders, creator, applications, claims, notes, newsletter, stays, experiences, products, rewards, uploads, adminRecords] =
    await Promise.all([
      prisma.visit.findMany({ where: { userId }, orderBy: { visitedAt: "asc" }, select: { visitedAt: true, method: true, lastVerifiedAt: true, destination: { select: { name: true } } } }),
      prisma.pointsEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { points: true, reason: true, note: true, createdAt: true } }),
      prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "asc" }, select: { earnedAt: true, badge: { select: { label: true } } } }),
      prisma.rewardRedemption.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { code: true, pointsSpent: true, status: true, createdAt: true, usedAt: true, reward: { select: { name: true } } } }),
      prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { rating: true, title: true, body: true, verified: true, status: true, rejectionReason: true, createdAt: true, accommodation: { select: { name: true } }, experience: { select: { name: true } } },
      }),
      prisma.accommodationEnquiry.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { name: true, email: true, phone: true, checkIn: true, checkOut: true, guests: true, message: true, status: true, createdAt: true, accommodation: { select: { name: true } } } }),
      prisma.experienceEnquiry.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { name: true, email: true, phone: true, message: true, status: true, createdAt: true, experience: { select: { name: true } } } }),
      prisma.order.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "asc" },
        select: {
          orderNumber: true, createdAt: true, status: true, fulfillment: true, address: true, phone: true, totalAmount: true,
          paymentMethod: true, paymentStatus: true, paidAt: true, mpesaReceiptNumber: true, pesapalConfirmationCode: true,
          items: { select: { quantity: true, unitPrice: true, option: true, product: { select: { name: true } } } },
        },
      }),
      prisma.creator.findUnique({ where: { userId }, select: { id: true, slug: true, displayName: true, track: true, bio: true, specialties: true, location: true, avatar: true, links: true, status: true, createdAt: true } }),
      // adminNotes is our team's internal commentary and is intentionally not selected.
      prisma.creatorApplication.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { track: true, displayName: true, bio: true, specialties: true, location: true, portfolioLinks: true, pitch: true, followerNote: true, status: true, rejectionReason: true, termsVersion: true, agreedToTermsAt: true, createdAt: true },
      }),
      prisma.missionClaim.findMany({ where: { creator: { userId } }, orderBy: { claimedAt: "asc" }, select: { status: true, claimedAt: true, mission: { select: { title: true } } } }),
      prisma.fieldNote.findMany({
        where: { creator: { userId } },
        orderBy: { createdAt: "asc" },
        select: { title: true, promptsSnapshot: true, answers: true, body: true, photos: true, links: true, disclosureText: true, status: true, reviewNote: true, verifiedAt: true, verifiedMethod: true, publishedAt: true, pointsAwarded: true, createdAt: true, mission: { select: { title: true } } },
      }),
      prisma.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { createdAt: true, status: true, confirmedAt: true } }),
      prisma.accommodation.findMany({ where: { ownerId: userId }, select: { name: true } }),
      prisma.experience.findMany({ where: { ownerId: userId }, select: { name: true } }),
      prisma.product.findMany({ where: { sellerId: userId }, select: { name: true } }),
      prisma.reward.findMany({ where: { ownerId: userId }, select: { name: true } }),
      prisma.uploadedImage.findMany({ where: { uploaderId: userId }, orderBy: { createdAt: "asc" }, select: { url: true, purpose: true, createdAt: true } }),
      prisma.adminAuditLog.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: "asc" }, select: { action: true, detail: true, createdAt: true } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    about: "A copy of the personal data Visit Taita holds that is linked to your account.",
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      memberSince: user.createdAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      emailVerifiedAt: user.emailVerifiedAt,
      newsletterSubscribed: !!newsletter && newsletter.status === "ACTIVE" && !!newsletter.confirmedAt,
      newsletterStatus: newsletter?.status ?? null,
      newsletterSince: newsletter?.confirmedAt ?? null,
    },
    passport: {
      visits: visits.map((v) => ({ place: v.destination.name, method: v.method, firstVisit: v.visitedAt, lastVerifiedCheckin: v.lastVerifiedAt })),
      pointsHistory: points,
      badges: badges.map((b) => ({ badge: b.badge.label, earnedAt: b.earnedAt })),
      vouchers: vouchers.map((v) => ({ reward: v.reward.name, code: v.code, pointsSpent: v.pointsSpent, status: v.status, claimedAt: v.createdAt, usedAt: v.usedAt })),
    },
    reviews: reviews.map((r) => ({
      about: r.accommodation?.name ?? r.experience?.name ?? null,
      rating: r.rating, title: r.title, text: r.body, verifiedGuest: r.verified, status: r.status, moderationNote: r.rejectionReason, writtenAt: r.createdAt,
    })),
    enquiries: {
      stays: stayEnq.map(({ accommodation, ...rest }) => ({ listing: accommodation.name, ...rest })),
      experiences: expEnq.map(({ experience, ...rest }) => ({ listing: experience.name, ...rest })),
    },
    orders: orders.map(({ items, ...rest }) => ({ ...rest, items: items.map((i) => ({ product: i.product.name, option: i.option, quantity: i.quantity, unitPrice: i.unitPrice })) })),
    creator: creator
      ? {
          profile: creator,
          applications,
          missions: claims.map((c) => ({ mission: c.mission.title, status: c.status, claimedAt: c.claimedAt })),
          fieldNotes: notes.map(({ mission, ...rest }) => ({ mission: mission.title, ...rest })),
        }
      : null,
    managed: { stays: stays.map((x) => x.name), experiences: experiences.map((x) => x.name), products: products.map((x) => x.name), rewards: rewards.map((x) => x.name) },
    uploads: uploads.map((u) => ({ url: u.url, kind: u.purpose, uploadedAt: u.createdAt })),
    administrativeActions: adminRecords.map((r) => ({ action: r.action, detail: r.detail, at: r.createdAt })),
    notIncluded: [
      "Your password — we only store a one-way hash of it, which cannot be turned back into your password.",
      "Internal notes our team may have written about applications or enquiries.",
      "Data not linked to your account, such as an enquiry sent without signing in. Contact us for that, and we may need to confirm who you are.",
    ],
  };
}
