import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toggleVisit } from "@/lib/actions/passport";
import { CHECKIN_POINTS } from "@/lib/passport";
import SectionHeading from "@/components/SectionHeading";
import LocationCheckinButton from "@/components/passport/LocationCheckinButton";

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

  const visitMethodByDestination = new Map(user.visits.map((v) => [v.destinationId, v.method]));
  const earnedBadgeKeys = new Set(user.badges.map((b) => b.badge.key));
  const checkedInCount = user.visits.filter((v) => v.method !== "SELF_REPORTED").length;

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="font-body text-sm text-rust">Taita Passport</p>
        <h1 className="mt-1 font-display text-4xl text-stone">{user.name}</h1>
        <p className="mt-2 font-body text-stone/70">
          {user.points} points · {checkedInCount} check-ins · {user.badges.length} of {allBadges.length} badges
        </p>
        <Link
          href="/passport/rewards"
          className="focus-ring mt-4 inline-block rounded-full border border-stone/25 px-5 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
        >
          Spend your points →
        </Link>

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
                    earned ? "border-ochre bg-ochre/10" : "border-stone/10 opacity-40"
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

        {/* CHECK-INS */}
        <div className="mt-16">
          <SectionHeading
            title="Check in around Taita"
            description={`Earn ${CHECKIN_POINTS} points the first time you check in at a place — scan the QR code on site, or tap "Check in here" when you're nearby. Your location is used once, only to confirm you're close — we don't store it.`}
          />
          <div className="mt-6 divide-y divide-stone/10">
            {destinations.map((d) => {
              const method = visitMethodByDestination.get(d.id);
              const verified = method === "QR" || method === "LOCATION";
              const selfReported = method === "SELF_REPORTED";
              const hasCoordinates = d.latitude !== null && d.longitude !== null;

              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-display text-lg text-stone">{d.name}</p>
                    <p className="font-body text-sm text-stone/50">
                      {d.region}
                      {selfReported && " · marked as visited (no points)"}
                    </p>
                  </div>

                  {verified ? (
                    <span className="rounded-full bg-canopy px-4 py-2 font-body text-sm text-parchment">
                      Checked in ✓
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-start justify-end gap-3">
                      {hasCoordinates ? (
                        <LocationCheckinButton destinationId={d.id} />
                      ) : (
                        <p className="max-w-[12rem] text-right font-body text-xs text-stone/50">
                          Scan the QR code at the site to check in.
                        </p>
                      )}
                      <form
                        action={async () => {
                          "use server";
                          await toggleVisit(d.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
                        >
                          {selfReported ? "Undo" : "I've been here"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
