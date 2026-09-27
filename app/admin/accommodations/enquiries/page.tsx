import { prisma } from "@/lib/prisma";
import AccommodationEnquiryStatusSelect from "@/components/admin/AccommodationEnquiryStatusSelect";

export default async function AdminAccommodationEnquiriesPage() {
  const enquiries = await prisma.accommodationEnquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { accommodation: true },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Stay — Enquiries</h1>

      <div className="mt-8 divide-y divide-stone/10">
        {enquiries.map((e) => (
          <div key={e.id} className="py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-body text-xs text-stone/50">
                  {e.accommodation.name}
                  {e.checkIn && e.checkOut
                    ? ` · ${e.checkIn.toLocaleDateString()} – ${e.checkOut.toLocaleDateString()}`
                    : ""}
                  {e.guests ? ` · ${e.guests} guests` : ""}
                </p>
                <p className="font-display text-lg text-stone">{e.name}</p>
                <p className="font-body text-sm text-stone/60">
                  {e.email} · {e.phone}
                </p>
                <p className="mt-2 max-w-prose font-body text-sm text-stone/70">{e.message}</p>
                <p className="mt-1 font-body text-xs text-stone/40">{e.createdAt.toLocaleString()}</p>
              </div>
              <AccommodationEnquiryStatusSelect enquiryId={e.id} status={e.status} />
            </div>
          </div>
        ))}
        {enquiries.length === 0 && <p className="py-8 font-body text-stone/50">No enquiries yet.</p>}
      </div>
    </div>
  );
}
