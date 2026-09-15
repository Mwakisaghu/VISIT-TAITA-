import { prisma } from "@/lib/prisma";
import FestivalSessionForm from "@/components/admin/FestivalSessionForm";

export default async function NewFestivalSessionPage() {
  const venues = await prisma.festivalVenue.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New session</h1>
      {venues.length > 0 ? (
        <FestivalSessionForm venues={venues} />
      ) : (
        <p className="mt-6 font-body text-stone/60">
          You need at least one venue before you can schedule a session.
        </p>
      )}
    </div>
  );
}
