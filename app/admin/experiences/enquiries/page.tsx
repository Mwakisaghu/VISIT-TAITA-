import { prisma } from "@/lib/prisma";
import ExperienceEnquiryStatusSelect from "@/components/admin/ExperienceEnquiryStatusSelect";

export default async function AdminExperienceEnquiriesPage() {
  const enquiries = await prisma.experienceEnquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { experience: true },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Experiences — Enquiries</h1>

      <div className="mt-8 divide-y divide-stone/10">
        {enquiries.map((e) => (
          <div key={e.id} className="py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-body text-xs text-stone/50">
                  {e.experience.name}
                  {e.preferredDate ? ` · ${e.preferredDate.toLocaleDateString()}` : ""}
                  {e.partySize ? ` · ${e.partySize} people` : ""}
                </p>
                <p className="font-display text-lg text-stone">{e.name}</p>
                <p className="font-body text-sm text-stone/60">
                  {e.email} · {e.phone}
                </p>
                <p className="mt-2 max-w-prose font-body text-sm text-stone/70">{e.message}</p>
                <p className="mt-1 font-body text-xs text-stone/40">{e.createdAt.toLocaleString()}</p>
              </div>
              <ExperienceEnquiryStatusSelect enquiryId={e.id} status={e.status} />
            </div>
          </div>
        ))}
        {enquiries.length === 0 && <p className="py-8 font-body text-stone/50">No enquiries yet.</p>}
      </div>
    </div>
  );
}
