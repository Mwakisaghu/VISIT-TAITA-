import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { partnerTypeLabel } from "@/lib/format";
import ApplicationReviewPanel from "@/components/partners/ApplicationReviewPanel";

export default async function AdminPartnerDetailPage({ params }: { params: { id: string } }) {
  const application = await prisma.partnerApplication.findUnique({
    where: { id: params.id },
  });
  if (!application) notFound();

  return (
    <div>
      <p className="font-body text-sm text-rust">{partnerTypeLabel(application.partnerType)}</p>
      <h1 className="mt-1 font-display text-3xl text-stone">{application.businessName}</h1>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-body text-sm text-stone/80">
        <dt className="text-stone/50">Contact</dt>
        <dd>{application.contactName}</dd>
        <dt className="text-stone/50">Email</dt>
        <dd>{application.email}</dd>
        <dt className="text-stone/50">Phone</dt>
        <dd>{application.phone}</dd>
        {application.website && (
          <>
            <dt className="text-stone/50">Website</dt>
            <dd>{application.website}</dd>
          </>
        )}
        <dt className="text-stone/50">Submitted</dt>
        <dd>{application.createdAt.toLocaleDateString()}</dd>
      </dl>

      <p className="mt-6 max-w-prose whitespace-pre-line font-body text-stone/80">
        {application.message}
      </p>

      <ApplicationReviewPanel
        applicationId={application.id}
        status={application.status}
        partnerType={application.partnerType}
      />
    </div>
  );
}
