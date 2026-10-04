import Image from "next/image";
import Link from "next/link";
import type { Mission } from "@prisma/client";
import { formatDeadline, missionAvailability, spotsLeft } from "@/lib/missions";
import { safeHttpUrl } from "@/lib/url";

type MissionWithRelations = Mission & {
  destination: { name: string };
  sponsor: { name: string } | null;
};

/** Short badge about who supports the mission — the disclosure is visible from the very first glance. */
export function supportBadge(m: { support: string; hostName: string | null; sponsor: { name: string } | null }) {
  if (m.support === "SPONSORED" && m.sponsor) return `Presented by ${m.sponsor.name}`;
  if (m.support === "HOSTED" && m.hostName) return `Hosted by ${m.hostName}`;
  return null;
}

export default function MissionCard({ mission }: { mission: MissionWithRelations }) {
  const image = safeHttpUrl(mission.image);
  const badge = supportBadge(mission);
  const availability = missionAvailability(mission);
  const left = spotsLeft(mission);

  return (
    <Link
      href={`/missions/${mission.slug}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-sm border border-stone/15 transition-colors hover:border-rust"
    >
      {image && (
        <div className="relative h-44 w-full bg-stone/10">
          <Image src={image} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="font-body text-xs text-rust">{mission.campaign ?? "Mission"}</p>
        <p className="mt-1 font-display text-xl text-stone group-hover:text-rust">{mission.title}</p>
        <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-stone/70">{mission.summary}</p>

        {badge && (
          <p className="mt-3 w-fit rounded-full bg-ochre/20 px-3 py-0.5 font-body text-xs text-stone">{badge}</p>
        )}

        <p className="mt-4 font-body text-xs text-stone/60">
          📍 {mission.destination.name}
          {mission.rewardPoints > 0 ? ` · ${mission.rewardPoints} points` : ""}
        </p>
        <p className="mt-1 font-body text-xs text-stone/50">
          {!availability.open
            ? availability.reason === "full"
              ? "All spots taken"
              : "Closed"
            : [
                mission.closesAt ? `Closes ${formatDeadline(mission.closesAt)}` : "Open until filled",
                left !== null ? `${left} spot${left === 1 ? "" : "s"} left` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
