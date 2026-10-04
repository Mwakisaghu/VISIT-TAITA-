import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteDestination } from "@/lib/actions/admin";
import { generateMissingCheckinTokens } from "@/lib/actions/checkin-admin";

export default async function AdminDestinationsPage() {
  const destinations = await prisma.destination.findMany({ orderBy: { updatedAt: "desc" } });
  const missingCodes = destinations.filter((d) => !d.checkinToken).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Destinations</h1>
        <Link
          href="/admin/destinations/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New destination
        </Link>
      </div>

      {missingCodes > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-ochre/50 bg-ochre/10 p-4">
          <p className="font-body text-sm text-stone">
            {missingCodes} destination{missingCodes > 1 ? "s don't" : " doesn't"} have a Passport check-in code yet.
          </p>
          <form
            action={async () => {
              "use server";
              await generateMissingCheckinTokens();
            }}
          >
            <button
              type="submit"
              className="focus-ring rounded-full bg-stone px-5 py-2 font-body text-sm text-parchment hover:bg-stone-soft"
            >
              Generate missing codes
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 divide-y divide-stone/10">
        {destinations.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {d.category} · {d.status}
                {d.isDemo && " · demo"}
                {d.checkinToken ? " · QR ready" : " · no QR yet"}
                {d.latitude !== null && d.longitude !== null ? " · GPS check-in" : ""}
              </p>
              <p className="font-display text-lg text-stone">{d.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/destinations/${d.id}/qr`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                QR
              </Link>
              <Link
                href={`/admin/destinations/${d.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteDestination(d.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {destinations.length === 0 && (
          <p className="py-8 font-body text-stone/50">No destinations yet.</p>
        )}
      </div>
    </div>
  );
}
