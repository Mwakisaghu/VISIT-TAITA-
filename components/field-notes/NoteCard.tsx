import Image from "next/image";
import Link from "next/link";
import VerifiedBadge from "@/components/field-notes/VerifiedBadge";
import { supportBadge } from "@/components/missions/MissionCard";
import { safeHttpUrl } from "@/lib/url";
import { canOptimize } from "@/lib/image-src";

export type NoteCardData = {
  slug: string;
  title: string;
  photos: string[];
  verifiedAt: Date;
  verifiedMethod: string;
  creator: { displayName: string };
  mission: {
    support: string;
    hostName: string | null;
    destination: { name: string };
    sponsor: { name: string } | null;
  };
};

export default function NoteCard({ note }: { note: NoteCardData }) {
  const photo = note.photos.map((p) => safeHttpUrl(p)).find((p): p is string => !!p) ?? null;
  const badge = supportBadge(note.mission);
  return (
    <Link
      href={`/notes/${note.slug}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-sm border border-stone/15 transition-colors hover:border-rust"
    >
      {photo && (
        <div className="relative h-44 w-full bg-stone/10">
          <Image src={photo} alt="" fill unoptimized={!canOptimize(photo)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <VerifiedBadge compact place={note.mission.destination.name} at={note.verifiedAt} method={note.verifiedMethod} />
        <p className="mt-2 font-display text-xl text-stone group-hover:text-rust">{note.title}</p>
        <p className="mt-2 font-body text-sm text-stone/60">
          By {note.creator.displayName} · 📍 {note.mission.destination.name}
        </p>
        {badge && <p className="mt-3 w-fit rounded-full bg-ochre/20 px-3 py-0.5 font-body text-xs text-stone">{badge}</p>}
      </div>
    </Link>
  );
}
