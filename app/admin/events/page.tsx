import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteEvent } from "@/lib/actions/admin";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { eventDate: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Events</h1>
        <Link
          href="/admin/events/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New event
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {e.program} · {e.status}
                {e.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{e.name}</p>
              <p className="font-body text-sm text-stone/50">
                {e.eventDate.toLocaleDateString()} · {e.location}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/events/${e.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteEvent(e.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="py-8 font-body text-stone/50">No events yet.</p>}
      </div>
    </div>
  );
}
