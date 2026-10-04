import type { Metadata } from "next";
import Link from "next/link";
import NoteCard from "@/components/field-notes/NoteCard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Field Notes",
  description: "Evidence from the ground: reports from the Taita Field Crew, each tied to a verified visit.",
};

// Same for every visitor, so it stays cached.
export const revalidate = 60;

export default async function NotesPage() {
  const notes = await prisma.fieldNote.findMany({
    where: { status: "APPROVED", creator: { status: "ACTIVE" } },
    orderBy: { publishedAt: "desc" },
    take: 60,
    include: {
      creator: { select: { displayName: true } },
      mission: { select: { support: true, hostName: true, destination: { select: { name: true } }, sponsor: { select: { name: true } } } },
    },
  });

  return (
    <div>
      <section className="bg-stone px-6 py-20 text-parchment sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm tracking-wide text-ochre">Taita Field Crew</p>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl">
            Field Notes.
            <br />
            Proof they were there.
          </h1>
          <p className="mt-5 max-w-lg font-body text-lg text-parchment/85">
            Every note is filed after a verified check-in at the place itself — a QR code or GPS, after the mission
            was taken — and shows evidence, not adjectives.
          </p>
          <Link href="/missions" className="focus-ring mt-8 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep">
            See open missions
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        {notes.length === 0 ? (
          <p className="max-w-prose font-body text-stone/60">
            The first Field Notes are on their way. Each one will appear here once the crew has been to the place and our team has reviewed it.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
