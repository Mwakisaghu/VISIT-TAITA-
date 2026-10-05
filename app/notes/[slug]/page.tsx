import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import VerifiedBadge from "@/components/field-notes/VerifiedBadge";
import FeaturedListings from "@/components/listings/FeaturedListings";
import ViewBeacon from "@/components/impact/ViewBeacon";
import { supportBadge } from "@/components/missions/MissionCard";
import { linkLabel, trackLabel } from "@/lib/creators";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

// Same for every visitor, so it stays cached.
export const revalidate = 60;

async function loadNote(slug: string) {
  const note = await prisma.fieldNote.findUnique({
    where: { slug },
    include: {
      creator: { select: { displayName: true, slug: true, track: true, status: true } },
      mission: {
        select: {
          title: true,
          slug: true,
          campaign: true,
          support: true,
          hostName: true,
          destination: { select: { name: true } },
          sponsor: { select: { name: true } },
          featuredAccommodation: { select: { slug: true, name: true, image: true, region: true, priceFrom: true, status: true } },
          featuredExperience: { select: { slug: true, name: true, image: true, region: true, priceFrom: true, status: true } },
        },
      },
    },
  });
  // Only published notes are public — pending, returned and hidden ones are never shown.
  return note && note.status === "APPROVED" ? note : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const note = await loadNote(params.slug);
  if (!note) return {};
  const lead = note.answers[0] ?? note.body ?? "";
  return { title: `${note.title} — Field Note`, description: lead.slice(0, 160) };
}

export default async function FieldNotePublicPage({ params }: { params: { slug: string } }) {
  const note = await loadNote(params.slug);
  if (!note) notFound();

  const photos = note.photos.map((p) => safeHttpUrl(p)).filter((p): p is string => !!p);
  const links = note.links.map((l) => safeHttpUrl(l)).filter((l): l is string => !!l);
  const badge = supportBadge(note.mission);
  const creatorPublic = note.creator.status === "ACTIVE";

  return (
    <article className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <ViewBeacon kind="NOTE" id={note.id} />
        <Link href="/notes" className="font-body text-sm text-stone/60 hover:text-rust">
          ← All Field Notes
        </Link>

        <p className="mt-6 font-body text-sm text-rust">{note.mission.campaign ?? "Field Note"}</p>
        <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">{note.title}</h1>
        <p className="mt-3 font-body text-stone/70">
          By{" "}
          {creatorPublic ? (
            <Link href={`/creators/${note.creator.slug}`} className="underline hover:text-rust">
              {note.creator.displayName}
            </Link>
          ) : (
            note.creator.displayName
          )}{" "}
          · {trackLabel(note.creator.track)}
        </p>

        <div className="mt-6">
          <VerifiedBadge place={note.mission.destination.name} at={note.verifiedAt} method={note.verifiedMethod} />
        </div>

        {(badge || note.disclosureText) && (
          <div className="mt-4 rounded-sm border border-ochre/50 bg-ochre/10 p-4">
            {badge && <p className="font-body text-sm font-semibold text-stone">{badge}</p>}
            {note.disclosureText && <p className="mt-1 font-body text-sm text-stone/70">{note.disclosureText}</p>}
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {photos.map((src, i) => (
              <div key={src} className={`relative aspect-[4/3] overflow-hidden rounded-sm bg-stone/10 ${i === 0 && photos.length % 2 === 1 ? "sm:col-span-2" : ""}`}>
                <Image src={src} alt={`Photo by ${note.creator.displayName} at ${note.mission.destination.name}`} fill unoptimized sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        {note.promptsSnapshot.length > 0 && (
          <section className="mt-10 flex flex-col gap-6">
            {note.promptsSnapshot.map((prompt, i) => (
              <div key={`${i}-${prompt}`}>
                <h2 className="font-display text-xl text-stone">{prompt}</h2>
                <p className="mt-2 max-w-prose whitespace-pre-line font-body leading-relaxed text-stone/80">{note.answers[i]}</p>
              </div>
            ))}
          </section>
        )}

        {note.body && (
          <section className="mt-10">
            <h2 className="font-display text-xl text-stone">The story</h2>
            <p className="mt-2 max-w-prose whitespace-pre-line font-body leading-relaxed text-stone/80">{note.body}</p>
          </section>
        )}

        {links.length > 0 && (
          <section className="mt-10">
            <p className="font-body text-sm text-stone/50">Also posted on</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {links.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="focus-ring font-body text-sm text-stone underline hover:text-rust">
                    {linkLabel(url)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <FeaturedListings stay={note.mission.featuredAccommodation} experience={note.mission.featuredExperience} referral={{ kind: "note", slug: note.slug }} />

        <p className="mt-12 border-t border-stone/10 pt-6 font-body text-sm text-stone/60">
          Written for the mission{" "}
          <Link href={`/missions/${note.mission.slug}`} className="underline hover:text-rust">
            {note.mission.title}
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
