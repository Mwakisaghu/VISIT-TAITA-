import Link from "next/link";
import { getServerSession } from "next-auth";
import DemoAdminWarning from "@/components/admin/DemoAdminWarning";
import { loadAdminBadges } from "@/lib/admin-badges";
import { ATTENTION } from "@/lib/admin-nav";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

const safe = (p: Promise<number>) => p.catch(() => 0);

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  const manager = isManager(session?.user?.role);
  const firstName = (session?.user?.name ?? "").trim().split(/\s+/)[0];

  const [badges, destinations, stories, events, accommodations, experiences, upcomingBookings, products, orders, teams, fixtures, festivalSessions, openMissions, rewardsLive, vouchersReady, sponsors, subscribers, accounts, suspended] = await Promise.all([
    loadAdminBadges(manager),
    safe(prisma.destination.count()), safe(prisma.story.count()), safe(prisma.event.count()),
    safe(prisma.accommodation.count()), safe(prisma.experience.count()),
    manager ? safe(prisma.booking.count({ where: { status: "CONFIRMED", session: { startsAt: { gt: new Date() } } } })) : Promise.resolve(0),
    safe(prisma.product.count()), safe(prisma.order.count()),
    safe(prisma.sportTeam.count()), safe(prisma.sportFixture.count()), safe(prisma.festivalSession.count()),
    safe(prisma.mission.count({ where: { status: "OPEN" } })), safe(prisma.reward.count({ where: { status: "PUBLISHED" } })), safe(prisma.rewardRedemption.count({ where: { status: "ISSUED" } })),
    safe(prisma.sponsor.count({ where: { status: "PUBLISHED" } })), safe(prisma.newsletterSubscriber.count({ where: { status: "ACTIVE", confirmedAt: { not: null } } })),
    manager ? safe(prisma.user.count()) : Promise.resolve(0),
    manager ? safe(prisma.user.count({ where: { suspendedAt: { not: null } } })) : Promise.resolve(0),
  ]);

  const waiting = ATTENTION.filter((a) => (!a.managers || manager) && (badges[a.key] ?? 0) > 0);

  const sections: Array<{ title: string; stats: Array<{ label: string; value: number; href: string }> }> = [
    { title: "Places & content", stats: [{ label: "Destinations", value: destinations, href: "/admin/destinations" }, { label: "Stories", value: stories, href: "/admin/stories" }, { label: "Events", value: events, href: "/admin/events" }] },
    { title: "Stays & experiences", stats: [{ label: "Accommodations", value: accommodations, href: "/admin/accommodations" }, { label: "Experiences", value: experiences, href: "/admin/experiences" }, ...(manager ? [{ label: "Upcoming bookings", value: upcomingBookings, href: "/admin/bookings" }] : [])] },
    { title: "Shop", stats: [{ label: "Products", value: products, href: "/admin/shop/products" }, { label: "Orders", value: orders, href: "/admin/shop/orders" }] },
    { title: "Football cup & Taita Week", stats: [{ label: "Cup teams", value: teams, href: "/admin/cup/teams" }, { label: "Cup fixtures", value: fixtures, href: "/admin/cup/fixtures" }, { label: "Week sessions", value: festivalSessions, href: "/admin/week/sessions" }] },
    { title: "Community & sponsors", stats: [{ label: "Open missions", value: openMissions, href: "/admin/missions" }, { label: "Rewards live", value: rewardsLive, href: "/admin/rewards" }, { label: "Vouchers waiting to be used", value: vouchersReady, href: "/admin/rewards/redemptions" }, { label: "Sponsors live", value: sponsors, href: "/admin/sponsors" }, { label: "Newsletter subscribers", value: subscribers, href: "/admin/newsletter" }] },
    ...(manager ? [{ title: "People & access", stats: [{ label: "Accounts", value: accounts, href: "/admin/users" }, { label: "Suspended", value: suspended, href: "/admin/users?status=suspended" }] }] : []),
  ];

  const quick = [
    { href: "/admin/destinations/new", label: "Add a destination" },
    { href: "/admin/stories/new", label: "Write a story" },
    { href: "/admin/experiences/new", label: "Add an experience" },
    ...(manager ? [{ href: "/admin/users", label: "View all accounts" }, { href: "/admin/users/new", label: "Invite staff" }] : []),
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">{firstName ? `Welcome back, ${firstName}` : "Overview"}</h1>
      <DemoAdminWarning />

      <section aria-labelledby="attention" className="mt-8">
        <h2 id="attention" className="font-display text-xl text-stone">Needs attention</h2>
        {waiting.length === 0 ? (
          <p className="mt-3 rounded-sm border border-canopy/30 bg-canopy/5 p-4 font-body text-sm text-stone/80">You&apos;re all caught up — nothing is waiting for you.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone/10 rounded-sm border border-stone/10">
            {waiting.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-stone/5">
                  <span className="font-body text-sm text-stone"><strong className="font-display text-lg text-rust">{badges[a.key]}</strong>{" "}{a.text(badges[a.key] ?? 0).replace(/^\d+\s*/, "")}</span>
                  <span aria-hidden className="text-stone/40">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="quick" className="mt-8">
        <h2 id="quick" className="font-display text-xl text-stone">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {quick.map((q) => <Link key={q.href} href={q.href} className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">{q.label}</Link>)}
        </div>
      </section>

      <section aria-labelledby="glance" className="mt-10">
        <h2 id="glance" className="font-display text-xl text-stone">At a glance</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-stone/55">{s.title}</h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {s.stats.map((st) => (
                  <Link key={st.label} href={st.href} className="focus-ring rounded-sm border border-stone/10 p-4 hover:border-stone/30">
                    <p className="font-display text-2xl text-stone">{st.value}</p>
                    <p className="mt-1 font-body text-xs text-stone/60">{st.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
