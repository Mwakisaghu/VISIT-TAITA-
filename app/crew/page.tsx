import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MissionCard, { supportBadge } from "@/components/missions/MissionCard";
import { disclosureLine, formatDeadline, missionAvailability } from "@/lib/missions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your crew page" };

// Personal to the signed-in creator — never cached.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-body text-sm text-rust">Taita Field Crew</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Your crew page</h1>
        {children}
      </div>
    </div>
  );
}

export default async function CrewPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <Shell>
        <p className="mt-4 font-body text-stone/70">Sign in to see your missions.</p>
        <Link href="/login?next=%2Fcrew" className="focus-ring mt-6 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep">
          Sign in
        </Link>
      </Shell>
    );
  }

  // Being a creator is a PROFILE, not a role: a partner or staff member can have one too.
  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true, status: true, track: true, slug: true },
  });

  if (!creator) {
    return (
      <Shell>
        <p className="mt-4 max-w-prose font-body text-stone/70">This page is for Field Crew members. Join the crew to claim missions.</p>
        <Link href="/creators/apply" className="focus-ring mt-6 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep">
          Apply to join
        </Link>
      </Shell>
    );
  }

  if (creator.status !== "ACTIVE") {
    return (
      <Shell>
        <p className="mt-4 max-w-prose font-body text-stone/70">Your Field Crew profile is paused, so missions are hidden for now. Get in touch if that&apos;s unexpected.</p>
      </Shell>
    );
  }

  const now = new Date();
  const include = { destination: { select: { name: true } }, sponsor: { select: { name: true } } } as const;

  const claims = await prisma.missionClaim.findMany({
    where: { creatorId: creator.id, status: { in: ["ACTIVE", "SUBMITTED"] } },
    orderBy: { claimedAt: "desc" },
    include: { mission: { include } },
  });
  const heldIds = claims.map((c) => c.missionId);

  const candidates = await prisma.mission.findMany({
    where: {
      status: "OPEN",
      AND: [
        { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
        { OR: [{ track: null }, { track: creator.track }] },
      ],
      ...(heldIds.length > 0 ? { id: { notIn: heldIds } } : {}),
    },
    orderBy: [{ closesAt: "asc" }, { createdAt: "desc" }],
    include,
  });
  // Don't offer missions that are already full.
  const available = candidates.filter((m) => missionAvailability(m, now).open);

  return (
    <Shell>
      <p className="mt-2 font-body text-stone/70">
        Welcome, {creator.displayName}.{" "}
        <Link href={`/creators/${creator.slug}`} className="underline hover:text-rust">
          View your public profile
        </Link>
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">Your missions</h2>
        {claims.length === 0 ? (
          <p className="mt-3 font-body text-stone/60">You haven&apos;t claimed a mission yet — pick one below.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {claims.map((c) => {
              const m = c.mission;
              const disclosure = disclosureLine({ support: m.support, hostName: m.hostName, sponsorName: m.sponsor?.name ?? null });
              const badge = supportBadge(m);
              return (
                <article key={c.id} className="rounded-sm border border-stone/15 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-body text-xs text-rust">{m.campaign ?? "Mission"}</p>
                      <Link href={`/missions/${m.slug}`} className="font-display text-2xl text-stone hover:text-rust">
                        {m.title}
                      </Link>
                      <p className="mt-1 font-body text-sm text-stone/60">
                        📍 {m.destination.name}
                        {m.closesAt ? ` · closes ${formatDeadline(m.closesAt)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-canopy px-4 py-1 font-body text-xs text-parchment">
                      {c.status === "SUBMITTED" ? "Note submitted" : "Claimed"}
                    </span>
                  </div>

                  {m.prompts.length > 0 && (
                    <div className="mt-5">
                      <p className="font-body text-xs text-stone/50">Your note should show</p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {m.prompts.map((p) => (
                          <li key={p} className="font-body text-sm text-stone/80">
                            → {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {disclosure ? (
                    <div className="mt-5 rounded-sm border border-ochre/50 bg-ochre/10 p-4">
                      <p className="font-body text-xs text-stone/60">
                        {badge} — say so in your posts. Suggested line (check it suits you):
                      </p>
                      <p className="mt-1 select-all font-body text-sm text-stone">{disclosure}</p>
                    </div>
                  ) : (
                    <p className="mt-5 font-body text-xs text-stone/50">
                      Independent mission — nothing to disclose for this one. If anyone else gives you something for the same trip, disclose that.
                    </p>
                  )}

                  <p className="mt-5 font-body text-sm text-stone/60">
                    Check in at {m.destination.name} (QR code on site, or &quot;Check in here&quot; on your Passport). Filing your Field Note opens soon.
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-stone">Open to you</h2>
        {available.length === 0 ? (
          <p className="mt-3 font-body text-stone/60">Nothing new to claim right now — check back soon.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
