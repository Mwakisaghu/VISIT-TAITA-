import { getServerSession } from "next-auth";
import DemoAdminWarning from "@/components/admin/DemoAdminWarning";
import AttentionCard from "@/components/admin/overview/AttentionCard";
import GlancePanel from "@/components/admin/overview/GlancePanel";
import LaunchCard from "@/components/admin/overview/LaunchCard";
import QuickActions from "@/components/admin/overview/QuickActions";
import SingleSuperAdminWarning from "@/components/admin/SingleSuperAdminWarning";
import { loadAdminBadges } from "@/lib/admin-badges";
import { launchItems, loadLaunchCounts } from "@/lib/admin-launch";
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
  const attentionRows = waiting.map((a) => ({ key: a.key, icon: a.icon, text: a.text(badges[a.key] ?? 0), href: a.href }));
  const launch = launchItems(await loadLaunchCounts());

  const sections: Array<{ title: string; stats: Array<{ label: string; value: number; href: string }> }> = [
    { title: "Places & content", stats: [{ label: "Destinations", value: destinations, href: "/admin/destinations" }, { label: "Stories", value: stories, href: "/admin/stories" }, { label: "Events", value: events, href: "/admin/events" }] },
    { title: "Stays & experiences", stats: [{ label: "Accommodations", value: accommodations, href: "/admin/accommodations" }, { label: "Experiences", value: experiences, href: "/admin/experiences" }, ...(manager ? [{ label: "Upcoming bookings", value: upcomingBookings, href: "/admin/bookings" }] : [])] },
    { title: "Shop", stats: [{ label: "Products", value: products, href: "/admin/shop/products" }, { label: "Orders", value: orders, href: "/admin/shop/orders" }] },
    { title: "Football cup & Taita Week", stats: [{ label: "Cup teams", value: teams, href: "/admin/cup/teams" }, { label: "Cup fixtures", value: fixtures, href: "/admin/cup/fixtures" }, { label: "Week sessions", value: festivalSessions, href: "/admin/week/sessions" }] },
    { title: "Community & sponsors", stats: [{ label: "Open missions", value: openMissions, href: "/admin/missions" }, { label: "Rewards live", value: rewardsLive, href: "/admin/rewards" }, { label: "Vouchers waiting to be used", value: vouchersReady, href: "/admin/rewards/redemptions" }, { label: "Sponsors live", value: sponsors, href: "/admin/sponsors" }, { label: "Newsletter subscribers", value: subscribers, href: "/admin/newsletter" }] },
    ...(manager ? [{ title: "People & access", stats: [{ label: "Accounts", value: accounts, href: "/admin/users" }, { label: "Suspended", value: suspended, href: "/admin/users?status=suspended" }] }] : []),
  ];

  const create = [
    { href: "/admin/destinations/new", label: "Add a destination" },
    { href: "/admin/stories/new", label: "Write a story" },
    { href: "/admin/experiences/new", label: "Add an experience" },
  ];
  const manage = manager ? [{ href: "/admin/users", label: "View all accounts" }, { href: "/admin/users/new", label: "Invite staff" }] : [];
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" }).format(new Date());

  return (
    <div className="flex max-w-[74rem] flex-col gap-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-display text-[1.875rem] font-medium leading-[1.15] tracking-tight text-stone">Overview</h1>
        <p className="font-body text-sm text-admin-muted">{firstName ? `Welcome back, ${firstName} · ` : ""}{today}</p>
      </div>
      <div>
        <DemoAdminWarning />
        <SingleSuperAdminWarning />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <AttentionCard rows={attentionRows} />
        <LaunchCard items={launch} />
      </div>

      <QuickActions create={create} manage={manage} />

      <section aria-labelledby="glance" className="flex flex-col gap-3.5">
        <h2 id="glance" className="font-body text-[1.0625rem] font-bold leading-tight">At a glance</h2>
        <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fill,minmax(17.5rem,1fr))]">
          {sections.map((sec) => <GlancePanel key={sec.title} title={sec.title} stats={sec.stats} />)}
        </div>
      </section>
    </div>
  );
}
