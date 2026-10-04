import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SponsorReport from "@/components/impact/SponsorReport";
import { getSponsorReport } from "@/lib/impact-data";
import { prisma } from "@/lib/prisma";

// A private link: never indexed, never cached.
export const metadata: Metadata = {
  title: "Impact report",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicSponsorReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length > 64) notFound();

  const sponsor = await prisma.sponsor.findUnique({ where: { reportToken: token }, select: { id: true } });
  if (!sponsor) notFound();

  const report = await getSponsorReport(sponsor.id);
  if (!report) notFound();

  return (
    <div className="px-6 py-12">
      <SponsorReport data={report} />
    </div>
  );
}
