import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import ReportLinkControls from "@/components/admin/ReportLinkControls";
import SponsorReport from "@/components/impact/SponsorReport";
import { checkinBaseUrl, isLocalUrl } from "@/lib/checkin-url";
import { getSponsorReport } from "@/lib/impact-data";
import { prisma } from "@/lib/prisma";

export default async function AdminSponsorReportPage({ params }: { params: { id: string } }) {
  const [report, sponsor] = await Promise.all([
    getSponsorReport(params.id),
    prisma.sponsor.findUnique({ where: { id: params.id }, select: { reportToken: true } }),
  ]);
  if (!report || !sponsor) notFound();

  const base = checkinBaseUrl();
  // With no public address configured the link is still shown (as a path) with a warning — never "no link yet" when one exists.
  const url = sponsor.reportToken ? `${base ?? ""}/report/${sponsor.reportToken}` : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/impact" className="font-body text-sm text-stone/60 hover:text-rust">
          ← Impact
        </Link>
        <PrintButton label="Print or save as PDF" />
      </div>

      <div className="mt-6 print:hidden">
        <ReportLinkControls sponsorId={params.id} url={url} shareable={!!base && !isLocalUrl(base)} />
      </div>

      <div className="mt-10">
        <SponsorReport data={report} />
      </div>
    </div>
  );
}
