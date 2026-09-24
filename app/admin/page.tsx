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
