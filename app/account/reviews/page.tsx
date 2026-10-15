import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import { formatLong } from "@/lib/account-hub-rules";
import { noteChip, reviewChip } from "@/lib/account-hub-text";
import { authOptions } from "@/lib/auth";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> { return { title: tr("Reviews and Field Notes") }; }
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`${lp("/login")}?next=%2Faccount%2Freviews`);
  const l = getLocale(), userId = session.user.id;
  const [me, reviews, notes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } }),
    prisma.review.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, rating: true, status: true, rejectionReason: true, createdAt: true, accommodation: { select: { name: true, slug: true } }, experience: { select: { name: true, slug: true } } } }),
    prisma.fieldNote.findMany({ where: { creator: { userId } }, orderBy: { verifiedAt: "desc" }, take: 100, select: { id: true, slug: true, title: true, status: true, verifiedAt: true } }),
  ]);
  const nothing = reviews.length === 0 && notes.length === 0;
  return (
    <SubpageFrame title={tr("Reviews and Field Notes")} intro={tr("What you have written about places in Taita, and where each piece is.")}>
      {nothing ? (
        <EmptyList title={tr("Nothing written yet")} body={me?.emailVerifiedAt ? tr("Review a stay or an experience you have enjoyed, or join the Field Crew to write Field Notes.") : tr("Verify your email first. Then you can review stays and experiences, and join the Field Crew.")} actions={[{ label: me?.emailVerifiedAt ? tr("Browse experiences") : tr("Verify your email"), href: me?.emailVerifiedAt ? lp("/experiences") : lp("/account") }, { label: tr("About the Field Crew"), href: lp("/crew") }]} />
      ) : (
        <div className="flex flex-col gap-9">
          {reviews.length > 0 && (
            <section aria-labelledby="reviews-h">
              <h2 id="reviews-h" className="mb-3 font-display text-xl font-semibold">{tr("Reviews")}</h2>
              <ul className="flex flex-col gap-3" role="list">
                {reviews.map((r) => {
                  const target = r.accommodation ? { name: r.accommodation.name, href: lp(`/stay/listing/${r.accommodation.slug}`) } : r.experience ? { name: r.experience.name, href: lp(`/experiences/listing/${r.experience.slug}`) } : { name: tr("A place in Taita"), href: undefined };
                  return (
                    <ListCard key={r.id} title={target.name} href={target.href} meta={tr("{rating} out of 5. Written on {date}.", { rating: r.rating, date: formatLong(r.createdAt, l) })} chip={reviewChip(r.status)}>
                      {r.status === "REJECTED" && r.rejectionReason && <p className="font-body text-sm text-stone/80">{tr("Why: {reason}", { reason: r.rejectionReason })}</p>}
                    </ListCard>
                  );
                })}
              </ul>
            </section>
          )}
          {notes.length > 0 && (
            <section aria-labelledby="notes-h">
              <h2 id="notes-h" className="mb-3 font-display text-xl font-semibold">{tr("Field Notes")}</h2>
              <ul className="flex flex-col gap-3" role="list">
                {notes.map((n) => <ListCard key={n.id} title={n.title} href={n.status === "APPROVED" ? lp(`/notes/${n.slug}`) : lp(`/crew/notes/${n.slug}`)} meta={tr("Written on {date}", { date: formatLong(n.verifiedAt, l) })} chip={noteChip(n.status)} />)}
              </ul>
            </section>
          )}
        </div>
      )}
    </SubpageFrame>
  );
}
