import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toggleVisit } from "@/lib/actions/passport";
import SectionHeading from "@/components/SectionHeading";

export const metadata = { title: "Your Passport" };

export default async function PassportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [user, destinations, allBadges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { badges: { include: { badge: true } }, visits: true },
    }),
    prisma.destination.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
    }),
    prisma.badge.findMany(),
  ]);

  if (!user) redirect("/login");

  const visitedIds = new Set(user.visits.map((v) => v.destinationId));
  const earnedBadgeKeys = new Set(user.badges.map((b) => b.badge.key));

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="font-body text-sm text-rust">Taita Passport</p>
        <h1 className="mt-1 font-display text-4xl text-stone">{user.name}</h1>
        <p className="mt-2 font-body text-stone/70">
          {user.points} points · {user.badges.length} of {allBadges.length} badges
        </p>

        {/* BADGES */}
        <div className="mt-12">
          <SectionHeading title="Your badges" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {allBadges.map((badge) => {
              const earned = earnedBadgeKeys.has(badge.key);
              return (
                <div
                  key={badge.id}
                  className={`rounded-sm border p-4 text-center ${
                    earned
                      ? "border-ochre bg-ochre/10"
                      : "border-stone/10 opacity-40"
                  }`}
                  title={badge.description}
                >
                  <p className="text-3xl">{badge.icon}</p>
                  <p className="mt-2 font-body text-xs text-stone">{badge.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESTINATIONS */}
        <div className="mt-16">
          <SectionHeading
            title="Mark your visits"
            description="Tell us where you've been in Taita to unlock badges and points."
          />
          <div className="mt-6 divide-y divide-stone/10">
            {destinations.map((d) => {
              const visited = visitedIds.has(d.id);
              return (
                <div key={d.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-display text-lg text-stone">{d.name}</p>
                    <p className="font-body text-sm text-stone/50">{d.region}</p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await toggleVisit(d.id);
                    }}
                  >
                    <button
                      type="submit"
                      className={`focus-ring rounded-full px-4 py-2 font-body text-sm transition-colors ${
                        visited
                          ? "bg-canopy text-parchment hover:bg-canopy-deep"
                          : "border border-stone/20 text-stone hover:border-rust hover:text-rust"
                      }`}
                    >
                      {visited ? "Visited ✓" : "Mark visited"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
