import Image from "next/image";
import Link from "next/link";
import { METHODOLOGY, describeVisitors, formatCount } from "@/lib/impact";
import type { SponsorReportData } from "@/lib/impact-data";
import { formatDeadline } from "@/lib/missions";
import { safeHttpUrl } from "@/lib/url";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-stone/15 p-4">
      <p className="font-display text-3xl text-stone">{value}</p>
      <p className="mt-1 font-body text-xs text-stone/60">{label}</p>
    </div>
  );
}

/**
 * What a sponsor is shown about the missions they funded. Used by the admin preview and the shareable
 * link, so what staff review is exactly what the sponsor sees. Totals only — never private details.
 */
export default function SponsorReport({ data }: { data: SponsorReportData }) {
  const logo = safeHttpUrl(data.sponsor.logo);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone/15 pb-6">
        <div>
          <p className="font-body text-sm text-rust">Taita Field Crew · Impact report</p>
          <h1 className="mt-1 font-display text-4xl text-stone">{data.sponsor.name}</h1>
          <p className="mt-1 font-body text-sm text-stone/60">Prepared {formatDeadline(data.generatedAt)}</p>
        </div>
        {logo && (
          <span className="relative h-16 w-32 shrink-0">
            <Image src={logo} alt={`${data.sponsor.name} logo`} fill unoptimized sizes="128px" className="object-contain object-right" />
          </span>
        )}
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Missions run" value={formatCount(data.totals.missions)} />
        <Tile label="Creators involved" value={formatCount(data.totals.creators)} />
        <Tile label="Field Notes published" value={formatCount(data.totals.notes)} />
        <Tile label="Page views (approx.)" value={formatCount(data.totals.views)} />
      </section>

      {data.missions.length === 0 ? (
        <p className="mt-10 font-body text-stone/60">No sponsored missions have run yet. This report fills in as they do.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {data.missions.map((m) => {
            const i = m.impact;
            return (
              <section key={m.id} className="break-inside-avoid">
                <p className="font-body text-xs text-stone/50">
                  {m.campaign ? `${m.campaign} · ` : ""}📍 {m.place} · {m.status === "OPEN" ? "Open" : "Closed"}
                </p>
                <h2 className="font-display text-2xl text-stone">
                  <Link href={`/missions/${m.slug}`} className="hover:text-rust">
                    {m.title}
                  </Link>
                </h2>
                {m.supportNote && <p className="mt-1 font-body text-sm text-stone/70">What your sponsorship provided: {m.supportNote}</p>}

                <dl className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <dt className="font-body text-xs text-stone/50">Creators</dt>
                    <dd className="font-body text-lg text-stone">{formatCount(i.claims)}</dd>
                  </div>
                  <div>
                    <dt className="font-body text-xs text-stone/50">Field Notes published</dt>
                    <dd className="font-body text-lg text-stone">{formatCount(i.notes)}</dd>
                  </div>
                  <div>
                    <dt className="font-body text-xs text-stone/50">Page views (approx.)</dt>
                    <dd className="font-body text-lg text-stone">{formatCount(i.views)}</dd>
                  </div>
                </dl>

                <p className="mt-4 font-body text-sm text-stone/80">
                  {i.visitorsBefore !== null && i.visitorsAfter !== null && i.windowDays !== null
                    ? describeVisitors(i.visitorsBefore, i.visitorsAfter, i.windowDays)
                    : "Visitor figures appear here once the first Field Note is published."}
                </p>

                {m.notes.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2">
                    {m.notes.map((n) => (
                      <li key={n.id} className="font-body text-sm text-stone/80">
                        <Link href={`/notes/${n.slug}`} className="underline hover:text-rust">
                          {n.title}
                        </Link>{" "}
                        <span className="text-stone/50">
                          — by {n.creatorName}
                          {n.publishedAt ? `, ${formatDeadline(n.publishedAt)}` : ""} · {formatCount(n.views)} view{n.views === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-12 rounded-sm border border-stone/15 bg-stone/5 p-5">
        <h2 className="font-display text-lg text-stone">How to read these numbers</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {METHODOLOGY.map((line) => (
            <li key={line} className="font-body text-sm leading-relaxed text-stone/70">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
