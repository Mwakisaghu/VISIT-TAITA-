import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import FieldNoteForm from "@/components/field-notes/FieldNoteForm";
import VerifiedBadge from "@/components/field-notes/VerifiedBadge";
import { getVerification } from "@/lib/field-notes-data";
import { noteStatusLabel } from "@/lib/field-notes";
import { disclosureLine } from "@/lib/missions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "File your Field Note" };

// Personal to the signed-in creator — never cached.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/crew" className="font-body text-sm text-stone/60 hover:text-rust">
          ← Your crew page
        </Link>
        {children}
      </div>
    </div>
  );
}

export default async function FieldNotePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <Shell>
        <p className="mt-6 font-body text-stone/70">Sign in to file a Field Note.</p>
        <Link href={`/login?next=${encodeURIComponent(`/crew/notes/${params.slug}`)}`} className="focus-ring mt-6 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep">
          Sign in
        </Link>
      </Shell>
    );
  }

  const creator = await prisma.creator.findUnique({ where: { userId: session.user.id }, select: { id: true, status: true } });
  if (!creator || creator.status !== "ACTIVE") {
    return (
      <Shell>
        <p className="mt-6 font-body text-stone/70">Field Notes are for active Field Crew members.</p>
      </Shell>
    );
  }

  const mission = await prisma.mission.findUnique({
    where: { slug: params.slug },
    include: { destination: { select: { name: true } }, sponsor: { select: { name: true } } },
  });
  const claim =
    mission && mission.status !== "DRAFT"
      ? await prisma.missionClaim.findUnique({
          where: { missionId_creatorId: { missionId: mission.id, creatorId: creator.id } },
          include: { note: true },
        })
      : null;

  if (!mission || !claim || claim.status === "WITHDRAWN") {
    return (
      <Shell>
        <p className="mt-6 font-body text-stone/70">You haven&apos;t claimed this mission, so there&apos;s no note to file.</p>
        {mission && mission.status !== "DRAFT" && (
          <Link href={`/missions/${mission.slug}`} className="mt-4 inline-block font-body text-sm text-rust underline">
            View the mission
          </Link>
        )}
      </Shell>
    );
  }

  const note = claim.note;
  const verification = await getVerification(session.user.id, mission.destinationId, claim.claimedAt);
  const line = disclosureLine({ support: mission.support, hostName: mission.hostName, sponsorName: mission.sponsor?.name ?? null });
  const locked = note?.status === "APPROVED" || note?.status === "HIDDEN";

  return (
    <Shell>
      <p className="mt-6 font-body text-sm text-rust">{mission.campaign ?? "Mission"}</p>
      <h1 className="mt-1 font-display text-4xl text-stone">{mission.title}</h1>
      <p className="mt-2 font-body text-stone/60">📍 {mission.destination.name}</p>

      {note && (
        <div role="status" className="mt-8 rounded-sm border border-stone/15 bg-stone/5 p-4">
          <p className="font-body text-sm font-semibold text-stone">Status: {noteStatusLabel(note.status)}</p>
          {note.status === "CHANGES_REQUESTED" && note.reviewNote && (
            <p className="mt-2 font-body text-sm text-stone/80">The team asked: {note.reviewNote}</p>
          )}
          {note.status === "PENDING" && <p className="mt-1 font-body text-sm text-stone/70">We&apos;re reviewing it. You can still edit it below.</p>}
          {note.status === "APPROVED" && (
            <p className="mt-1 font-body text-sm text-stone/70">
              It&apos;s live —{" "}
              <Link href={`/notes/${note.slug}`} className="underline hover:text-rust">
                see it
              </Link>
              . Published notes can&apos;t be changed.
            </p>
          )}
          {note.status === "HIDDEN" && <p className="mt-1 font-body text-sm text-stone/70">This note has been taken off the public site. Get in touch if that&apos;s unexpected.</p>}
        </div>
      )}

      {locked ? null : verification.verified && verification.at && verification.method ? (
        <>
          <div className="mt-8">
            <VerifiedBadge place={mission.destination.name} at={verification.at} method={verification.method} />
          </div>
          <div className="mt-10">
            <FieldNoteForm
              missionId={mission.id}
              prompts={mission.prompts}
              disclosureLine={line}
              isRevision={!!note}
              defaults={
                note
                  ? { title: note.title, answers: note.answers, body: note.body ?? "", photos: note.photos.join("\n"), links: note.links.join("\n") }
                  : undefined
              }
            />
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-sm border border-ochre/50 bg-ochre/10 p-5">
          <p className="font-display text-xl text-stone">Check in at {mission.destination.name} first</p>
          <p className="mt-2 font-body text-sm text-stone/80">
            Field Notes are tied to a verified visit. Scan the QR code at {mission.destination.name}, or open your Passport and use &quot;Check in here&quot; when you&apos;re
            there. Then come back to file your note.
          </p>
          <p className="mt-2 font-body text-xs text-stone/60">
            A check-in from before you claimed this mission doesn&apos;t count — if you&apos;ve been before, check in again.
          </p>
          <Link href="/passport" className="focus-ring mt-4 inline-block rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep">
            Open my Passport
          </Link>
        </div>
      )}
    </Shell>
  );
}
