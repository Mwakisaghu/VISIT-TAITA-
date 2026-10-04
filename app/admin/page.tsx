import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [
    destinations,
    stories,
    events,
    users,
    subscribers,
    teams,
    fixtures,
    products,
    orders,
    pendingApplications,
    pendingProducts,
    festivalSessions,
    accommodations,
    experiences,
    pendingAccommodationEnquiries,
    pendingExperienceEnquiries,
    pendingReviews,
    pendingCreators,
    openMissions,
    pendingNotes,
    rewardsLive,
    vouchersReady,
    sponsors,
    newSponsorLeads,
  ] = await Promise.all([
    prisma.destination.count(),
    prisma.story.count(),
    prisma.event.count(),
    prisma.user.count(),
    prisma.newsletterSubscriber.count(),
    prisma.sportTeam.count(),
    prisma.sportFixture.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "DRAFT", seller: { role: "SELLER" } } }),
    prisma.festivalSession.count(),
    prisma.accommodation.count(),
    prisma.experience.count(),
    prisma.accommodationEnquiry.count({ where: { status: "NEW" } }),
    prisma.experienceEnquiry.count({ where: { status: "NEW" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.creatorApplication.count({ where: { status: "PENDING" } }),
    prisma.mission.count({ where: { status: "OPEN" } }),
    prisma.fieldNote.count({ where: { status: "PENDING" } }),
    prisma.reward.count({ where: { status: "PUBLISHED" } }),
    prisma.rewardRedemption.count({ where: { status: "ISSUED" } }),
    prisma.sponsor.count({ where: { status: "PUBLISHED" } }),
    prisma.sponsorLead.count({ where: { status: "NEW" } }),
  ]);

  const stats = [
    { label: "Destinations", value: destinations },
    { label: "Stories", value: stories },
    { label: "Events", value: events },
    { label: "Passport members", value: users },
    { label: "Newsletter subscribers", value: subscribers },
    { label: "Cup teams", value: teams },
    { label: "Cup fixtures", value: fixtures },
    { label: "Shop products", value: products },
    { label: "Shop orders", value: orders },
    { label: "Pending partner applications", value: pendingApplications },
    { label: "Pending listing reviews", value: pendingProducts },
    { label: "Taita Week sessions", value: festivalSessions },
    { label: "Accommodations", value: accommodations },
    { label: "Experiences", value: experiences },
    { label: "New stay enquiries", value: pendingAccommodationEnquiries },
    { label: "New experience enquiries", value: pendingExperienceEnquiries },
    { label: "Reviews awaiting approval", value: pendingReviews },
    { label: "Creator applications to review", value: pendingCreators },
    { label: "Open missions", value: openMissions },
    { label: "Field Notes to review", value: pendingNotes },
    { label: "Published rewards", value: rewardsLive },
    { label: "Vouchers awaiting use", value: vouchersReady },
    { label: "Published sponsors", value: sponsors },
    { label: "New sponsor leads", value: newSponsorLeads },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Overview</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-sm border border-stone/10 p-5">
            <p className="font-display text-3xl text-stone">{s.value}</p>
            <p className="mt-1 font-body text-sm text-stone/60">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
