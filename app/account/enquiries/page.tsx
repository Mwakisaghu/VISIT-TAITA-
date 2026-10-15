import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import { formatLong } from "@/lib/account-hub-rules";
import { enquiryChip } from "@/lib/account-hub-text";
import { authOptions } from "@/lib/auth";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> { return { title: tr("My enquiries") }; }
export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`${lp("/login")}?next=%2Faccount%2Fenquiries`);
  const l = getLocale(), userId = session.user.id;
  const [exp, acc] = await Promise.all([
    prisma.experienceEnquiry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, createdAt: true, experience: { select: { name: true, slug: true } } } }),
    prisma.accommodationEnquiry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, createdAt: true, accommodation: { select: { name: true, slug: true } } } }),
  ]);
  const rows = [
    ...exp.map((e) => ({ id: "x" + e.id, status: e.status, createdAt: e.createdAt, name: e.experience.name, href: lp(`/experiences/listing/${e.experience.slug}`) })),
    ...acc.map((e) => ({ id: "a" + e.id, status: e.status, createdAt: e.createdAt, name: e.accommodation.name, href: lp(`/stay/listing/${e.accommodation.slug}`) })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return (
    <SubpageFrame title={tr("My enquiries")} intro={tr("The questions you have sent to hosts, and whether they have answered.")}>
      {rows.length === 0 ? (
        <EmptyList title={tr("No enquiries yet")} body={tr("When you ask a host about a stay or an experience, you can follow their reply here.")} actions={[{ label: tr("Find a place to stay"), href: lp("/stay") }, { label: tr("Browse experiences"), href: lp("/experiences") }]} />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {rows.map((r) => <ListCard key={r.id} title={r.name} href={r.href} meta={tr("Sent on {date}", { date: formatLong(r.createdAt, l) })} chip={enquiryChip(r.status)} />)}
        </ul>
      )}
    </SubpageFrame>
  );
}
