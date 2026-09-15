import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import SessionCard from "@/components/festival/SessionCard";
import DemoNotice from "@/components/DemoNotice";
import { formatSessionDay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Week",
  description: "The full Taita Week festival programme — music, food, culture, sport and more.",
};

export const revalidate = 60;

export default async function TaitaWeekPage() {
  const [sessions, venues] = await Promise.all([
    prisma.festivalSession.findMany({
      where: { status: "PUBLISHED" },
      include: { venue: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.festivalVenue.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasDemo = sessions.some((s) => s.isDemo);

  // Group sessions by calendar day so the programme reads as a schedule,
  // not a flat list — the day itself isn't a separate field, it's derived
  // from each session's start time.
  const days = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = session.startsAt.toISOString().slice(0, 10);
    const existing = days.get(key) ?? [];
    existing.push(session);
    days.set(key, existing);
  }
  const orderedDays = Array.from(days.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      {/* HEADER */}
      <section className="bg-rust px-6 py-20 text-parchment">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm text-parchment/70">Taita Week</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            A week-long festival
            <br />
            of everything Taita.
          </h1>
          <p className="mt-4 max-w-md font-body text-parchment/85">
            Music, food, culture and sport — three days across Voi and
            Wundanyi, most of it free to attend.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-3">
          {/* PROGRAMME */}
          <div className="lg:col-span-2">
            <SectionHeading title="Programme" />
            {orderedDays.length > 0 ? (
              orderedDays.map(([dateKey, daySessions]) => (
                <div key={dateKey} className="mt-10 first:mt-6">
                  <p className="font-display text-xl text-stone">
                    {formatSessionDay(daySessions[0].startsAt)}
                  </p>
                  <div className="mt-2">
                    {daySessions.map((session) => (
                      <SessionCard key={session.slug} session={session} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="mt-6 font-body text-stone/50">Programme coming soon.</p>
            )}
          </div>

          {/* VENUES */}
          <div>
            <SectionHeading title="Venues" />
            <div className="mt-6 flex flex-col gap-3">
              {venues.map((venue) => (
                <div key={venue.slug} className="rounded-sm border border-stone/10 px-4 py-3">
                  <p className="font-display text-stone">{venue.name}</p>
                  <p className="font-body text-xs text-stone/50">{venue.location}</p>
                </div>
              ))}
              {venues.length === 0 && (
                <p className="font-body text-sm text-stone/50">Venues to be announced.</p>
              )}
            </div>
          </div>
        </div>

        {hasDemo && (
          <div className="mt-16">
            <DemoNotice>sample programme for layout only — dates and acts to be confirmed.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
