import Image from "next/image";
import Link from "next/link";
import type { Creator } from "@prisma/client";
import { initials, specialtyLabel, trackLabel } from "@/lib/creators";
import { safeHttpUrl } from "@/lib/url";

export default function CreatorCard({ creator }: { creator: Creator }) {
  const avatar = safeHttpUrl(creator.avatar);
  return (
    <Link
      href={`/creators/${creator.slug}`}
      className="focus-ring group flex flex-col rounded-sm border border-stone/15 p-6 transition-colors hover:border-rust"
    >
      <div className="flex items-center gap-4">
        {avatar ? (
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone/10">
            <Image src={avatar} alt="" fill unoptimized sizes="56px" className="object-cover" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-canopy font-display text-lg text-parchment"
          >
            {initials(creator.displayName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-xl text-stone group-hover:text-rust">{creator.displayName}</p>
          <p className="font-body text-xs text-stone/50">
            {trackLabel(creator.track)}
            {creator.location ? ` · ${creator.location}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 font-body text-sm leading-relaxed text-stone/70">{creator.bio}</p>
      {creator.specialties.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {creator.specialties.slice(0, 3).map((s) => (
            <li key={s} className="rounded-full border border-stone/20 px-3 py-0.5 font-body text-xs text-stone/70">
              {specialtyLabel(s)}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
