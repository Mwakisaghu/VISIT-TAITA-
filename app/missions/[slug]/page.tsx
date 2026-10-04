import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import MissionClaimBox from "@/components/missions/MissionClaimBox";
import { supportBadge } from "@/components/missions/MissionCard";
import { trackLabel } from "@/lib/creators";
import { disclosureLine, formatDeadline, missionAvailability, spotsLeft } from "@/lib/missions";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

// Same for every visitor, so it stays cached. The visitor's own claim state loads on the client.
export const revalidate = 60;

async function loadMission(slug: string) {
  const mission = await prisma.mission.findUnique({
    where: { slug },
    include: { destination: { select: { name: true, region: true } }, sponsor: { select: { name: true } } },
  });
  // A draft is never public.
  return mission && mission.status !== "DRAFT" ? mission : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const mission = await loadMission(params.slug);
  if (!mission) return {};
  return { title: `${mission.title} — Field Crew mission`, description: mission.summary };
}

export default async function MissionPage({ params }: { params: { slug: string } }) {
  const mission = await loadMission(params.slug);
  if (!mission) notFound();

  const image = safeHttpUrl(mission.image);
  const availability = missionAvailability(mission);
  const left = spotsLeft(mission);
  const badge = supportBadge(mission);
  const disclosure = disclosureLine({
    support: mission.support,
    hostName: mission.hostName,
    sponsorName: mission.sponsor?.name ?? null,
  });

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/missions" className="font-body text-sm text-stone/60 hover:text-rust">
          ← All missions
        </Link>

        <p className="mt-6 font-body text-sm text-rust">{mission.campaign ?? "Mission"}</p>
        <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">{mission.title}</h1>
        <p className="mt-4 max-w-prose font-body text-lg text-stone/75">{mission.summary}</p>
        {badge && <p className="mt-4 w-fit rounded-full bg-ochre/20 px-4 py-1 font-body text-sm text-stone">{badge}</p>}

        {image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-sm bg-stone/10">
            <Image src={image} alt="" fill unoptimized priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-stone/10 py-5 sm:grid-cols-4">
          <div>
            <dt className="font-body text-xs text-stone/50">Place</dt>
            <dd className="font-body text-sm text-stone">{mission.destination.name}</dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">Open to</dt>
            <dd className="font-body text-sm text-stone">{mission.track ? `${trackLabel(mission.track)}s` : "Everyone in the crew"}</dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">{availability.open ? "Closes" : "Status"}</dt>
            <dd className="font-body text-sm text-stone">
              {!availability.open ? (availability.reason === "full" ? "All spots taken" : "Closed") : mission.closesAt ? formatDeadline(mission.closesAt) : "When filled"}
            </dd>
          </div>
          <div>
            <dt className="font-body text-xs text-stone/50">Spots · reward</dt>
            <dd className="font-body text-sm text-stone">
              {left === null ? "Open" : `${left} left`}
              {mission.rewardPoints > 0 ? ` · ${mission.rewardPoints} pts` : ""}
            </dd>
          </div>
        </dl>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone">The brief</h2>
          <p className="mt-3 max-w-prose whitespace-pre-line font-body leading-relaxed text-stone/80">{mission.brief}</p>
        </section>

        {mission.prompts.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-stone">What your note should show</h2>
            <p className="mt-2 max-w-prose font-body text-sm text-stone/60">
              Evidence, not adjectives — what a visitor can&apos;t see from a photo.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {mission.prompts.map((p) => (
                <li key={p} className="flex gap-3 font-body text-stone/80">
                  <span aria-hidden="true" className="text-rust">
                    →
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </section>
        )}

        {mission.support !== "NONE" && (
          <section className="mt-10 rounded-sm border border-ochre/50 bg-ochre/10 p-5">
            <h2 className="font-display text-xl text-stone">{mission.support === "HOSTED" ? "This mission is hosted" : "This mission is sponsored"}</h2>
            {mission.supportNote && <p className="mt-2 font-body text-sm text-stone/80">What&apos;s provided: {mission.supportNote}</p>}
            <p className="mt-2 font-body text-sm text-stone/70">
              Creators always say so in their posts, so you know who made it possible.
            </p>
            {disclosure && <p className="mt-3 font-body text-xs text-stone/50">Suggested disclosure: {disclosure}</p>}
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-2xl text-stone">How it works</h2>
          <ol className="mt-4 flex flex-col gap-3 font-body text-stone/80">
            <li>
              <strong className="text-stone">1. Claim a spot.</strong> Field Crew members hold a place on the mission.
            </li>
            <li>
              <strong className="text-stone">2. Go there and check in.</strong> Scan the QR code at {mission.destination.name} or use{" "}
              &quot;Check in here&quot; on your Passport — Field Notes are tied to a verified visit.
            </li>
            <li>
              <strong className="text-stone">3. File your Field Note.</strong> Opening soon.
            </li>
          </ol>
        </section>

        <div className="mt-10">
          {availability.open || mission.status === "OPEN" ? (
            <MissionClaimBox missionId={mission.id} missionTitle={mission.title} />
          ) : (
            <p className="font-body text-sm text-stone/60">
              {availability.open === false && availability.reason === "full" ? "All the spots on this mission have been taken." : "This mission is closed."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
