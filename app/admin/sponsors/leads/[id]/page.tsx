import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";
import { formatPrice } from "@/lib/format";
import SponsorLeadPanel from "@/components/admin/SponsorLeadPanel";

export default async function AdminSponsorLeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.sponsorLead.findUnique({
    where: { id: params.id },
    include: { package: { select: { name: true, startingPrice: true, priceNote: true } } },
  });
  if (!lead) notFound();

  const website = safeHttpUrl(lead.website);

  return (
    <div>
      <p className="font-body text-sm text-rust">{lead.package?.name ?? "No package chosen"}</p>
      <h1 className="mt-1 font-display text-3xl text-stone">{lead.companyName}</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-body text-sm text-stone/80">
        <dt className="text-stone/50">Contact</dt>
        <dd>{lead.contactName}</dd>
        <dt className="text-stone/50">Email</dt>
        <dd>
          <a href={`mailto:${lead.email}`} className="underline hover:text-rust">
            {lead.email}
          </a>
        </dd>
        <dt className="text-stone/50">Phone</dt>
        <dd>
          <a href={`tel:${lead.phone}`} className="underline hover:text-rust">
            {lead.phone}
          </a>
        </dd>
        {website && (
          <>
            <dt className="text-stone/50">Website</dt>
            <dd>
              <a href={website} target="_blank" rel="noopener noreferrer" className="underline hover:text-rust">
                {website}
              </a>
            </dd>
          </>
        )}
        {lead.budgetRange && (
          <>
            <dt className="text-stone/50">Budget</dt>
            <dd>{lead.budgetRange}</dd>
          </>
        )}
        {lead.package && (
          <>
            <dt className="text-stone/50">Package from</dt>
            <dd>
              {formatPrice(lead.package.startingPrice)}
              {lead.package.priceNote ? ` ${lead.package.priceNote}` : ""} (indicative)
            </dd>
          </>
        )}
        <dt className="text-stone/50">Submitted</dt>
        <dd>{lead.createdAt.toLocaleString()}</dd>
      </dl>

      <p className="mt-6 max-w-prose whitespace-pre-line font-body text-stone/80">{lead.message}</p>

      <SponsorLeadPanel leadId={lead.id} status={lead.status} adminNotes={lead.adminNotes} />
    </div>
  );
}
