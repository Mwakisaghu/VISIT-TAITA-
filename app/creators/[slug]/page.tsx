import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StoryCard from "@/components/StoryCard";
import { initials, linkLabel, specialtyLabel, trackLabel } from "@/lib/creators";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

// Same for every visitor, so it stays cached.
export const revalidate = 60;

async function loadCreator(slug: string) {
  return prisma.creator.findFirst({ where: { slug, status: "ACTIVE" } });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const creator = await loadCreator(params.slug);
  if (!creator) return {};
  return {
    title: `${creator.displayName} — Taita Field Crew`,
    description: creator.bio.slice(0, 160),
  };
}

export default async function CreatorProfilePage({ params }: { params: { slug: string } }) {
  const creator = await loadCreator(params.slug);
  if (!creator) notFound();

  const [stories] = await Promise.all([
    prisma.story.findMany({
      where: { authorId: creator.userId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const avatar = safeHttpUrl(creator.avatar);
  // Only real web addresses are ever rendered as links.
  const links = creator.links.map((l) => safeHttpUrl(l)).filter((l): l is string => !!l);

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/creators" className="font-body text-sm text-stone/60 hover:text-rust">
          ← The Field Crew
        </Link>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          {avatar ? (
            <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-stone/10">
              <Image src={avatar} alt={creator.displayName} fill unoptimized sizes="96px" className="object-cover" />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-canopy font-display text-3xl text-parchment"
            >
              {initials(creator.displayName)}
            </span>
          )}
          <div>
            <p className="font-body text-sm text-rust">
              {trackLabel(creator.track)}
              {creator.location ? ` · ${creator.location}` : ""}
            </p>
            <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">{creator.displayName}</h1>
          </div>
        </div>

        <p className="mt-8 max-w-prose whitespace-pre-line font-body text-lg leading-relaxed text-stone/85">{creator.bio}</p>

        {creator.specialties.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {creator.specialties.map((s) => (
              <li key={s} className="rounded-full border border-stone/20 px-4 py-1 font-body text-sm text-stone/70">
                {specialtyLabel(s)}
              </li>
            ))}
          </ul>
        )}

        {links.length > 0 && (
          <div className="mt-8">
            <p className="font-body text-sm text-stone/50">Find their work</p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {links.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring font-body text-sm text-stone underline hover:text-rust"
                  >
                    {linkLabel(url)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stories.length > 0 && (
          <section className="mt-16 border-t border-stone/10 pt-12">
            <h2 className="font-display text-3xl text-stone">Stories by {creator.displayName}</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {stories.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
