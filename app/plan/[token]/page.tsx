import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { KINDS, checkPlan, dayLabel, estimateTotal, isToken, keyOf, orderStops, timeLabel, todayIn, type Stop } from "@/lib/plan";
import { resolveStops } from "@/lib/plan-data";
import { deletePlan } from "@/lib/actions/plan";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string }> | { token: string } };
export const dynamic = "force-dynamic";
// A shared plan is for the people it was shared with: it is not for search engines.
export const metadata: Metadata = { title: "A Taita day", robots: { index: false, follow: false } };

const KIND_LABEL: Record<string, string> = { EXPERIENCE: "Experience", EVENT: "Event", STAY: "Stay", PLACE: "Place" };
const find = (token: string) => prisma.dayPlan.findUnique({ where: { token }, select: { id: true, token: true, title: true, day: true, partySize: true, userId: true, stops: { orderBy: { position: "asc" }, select: { kind: true, refId: true, sessionId: true, startMinutes: true, note: true } } } });

// `params` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function SharedPlanPage({ params }: Ctx) {
  const { token } = await params;
  if (!isToken(token)) notFound();
  const plan = await find(token);
  if (!plan) notFound();
  const now = new Date(); const session = await getServerSession(authOptions); const mine = !!session?.user?.id && session.user.id === plan.userId;
  const stops: Stop[] = plan.stops.map((s) => ({ kind: s.kind, refId: s.refId, sessionId: s.sessionId, startMinutes: s.startMinutes, note: s.note }));
  const found = await resolveStops(stops, plan.day, now);
  const info = new Map(stops.flatMap((s) => { const r = found.get(keyOf(s)); return r ? [[keyOf(s), r.info] as const] : []; }));
  const ordered = orderStops(stops); const { warnings } = checkPlan(stops.filter((s) => found.has(keyOf(s))), info); const total = estimateTotal(stops.filter((s) => found.has(keyOf(s))), info, plan.partySize);
  const past = plan.day < todayIn(now); const hasTimes = ordered.some((s) => s.kind !== "STAY" && typeof s.startMinutes === "number" && found.has(keyOf(s)));
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, ""); const canShare = /^https?:\/\/[^/\s]+$/.test(origin);
  const wa = canShare ? `https://wa.me/?text=${encodeURIComponent(`${plan.title}, ${dayLabel(plan.day)}\n${origin}/plan/${plan.token}`)}` : null;

  return (
    <div className="px-6 py-14 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">A Taita day · {dayLabel(plan.day)} · {plan.partySize} {plan.partySize === 1 ? "person" : "people"}</p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-tight text-stone">{plan.title}</h1>
        {past && <p role="status" className="mt-4 rounded-[2px] border border-stone/20 bg-[#F4EDDC] p-4 font-body text-sm text-stone">This day has passed.</p>}

        <ol className="mt-10 border-l-2 border-stone/20">
          {ordered.map((s) => {
            const r = found.get(keyOf(s));
            return (
              <li key={keyOf(s)} className="relative pb-9 pl-7">
                <span aria-hidden="true" className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-rust" />
                <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-stone/75">
                  {s.kind === "STAY" ? "Overnight" : typeof s.startMinutes === "number" ? timeLabel(s.startMinutes) : "Any time today"} · {KIND_LABEL[s.kind]}
                </p>
                {r ? (
                  <>
                    <h2 className="mt-1 font-display text-2xl leading-snug text-stone"><Link href={r.href} className="focus-ring hover:text-rust-deep">{r.info.name}</Link></h2>
                    <p className="mt-1 font-body text-sm text-stone/80">{r.region}{r.info.price != null ? ` · ${r.info.free ? "Free" : `${s.kind === "STAY" ? "from " : ""}${formatPrice(r.info.price)}${s.kind === "STAY" ? " a night" : s.kind === "PLACE" ? "" : " each"}`}` : r.info.free ? " · Free" : ""}</p>
                    {r.sessionProblem && <p role="note" className="mt-2 font-body text-sm font-semibold text-rust-deep">{r.sessionProblem} Please check the {KIND_LABEL[s.kind].toLowerCase()} page.</p>}
                    {s.note && <p className="mt-2 font-body text-sm italic text-stone/85">{s.note}</p>}
                    {s.kind !== "PLACE" && <Link href={r.href} className="focus-ring mt-2 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">{s.kind === "STAY" ? "Ask about this stay" : s.kind === "EVENT" ? (r.bookable ? "Get tickets" : "See the event") : "Book this"}<span className="sr-only"> : {r.info.name}</span></Link>}
                  </>
                ) : <p className="mt-1 font-body text-stone/80">No longer available.</p>}
              </li>
            );
          })}
        </ol>

        {warnings.length > 0 && (
          <section aria-labelledby="warn-title" className="mt-2 rounded-[2px] border border-ochre/60 bg-ochre/10 p-5">
            <h2 id="warn-title" className="font-body text-sm font-bold text-stone">Worth a look</h2>
            <ul className="mt-2 list-disc pl-5 font-body text-sm text-stone/90">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </section>
        )}

        <section aria-labelledby="total-title" className="mt-8 border-2 border-stone p-5">
          <h2 id="total-title" className="font-body text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-stone">The day, roughly</h2>
          <p className="mt-3 font-display text-3xl text-stone">{formatPrice(total.total)}<span className="font-body text-sm text-stone/75"> for {plan.partySize} {plan.partySize === 1 ? "person" : "people"}</span></p>
          <p className="mt-2 font-body text-xs text-stone/80">An estimate from listed prices{total.unpriced > 0 ? `; ${total.unpriced} ${total.unpriced === 1 ? "stop has" : "stops have"} no listed price and ${total.unpriced === 1 ? "is" : "are"} not counted` : ""}. <b>Nothing here is booked or paid</b>: each host confirms their own part through their own page.</p>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {hasTimes && <a href={`/plan/${plan.token}/calendar`} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-stone px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-stone">Add to calendar</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] bg-canopy px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment">Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a>}
          <Link href="/plan" className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] bg-rust px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment hover:bg-rust-deep">{mine ? "Plan another day" : "Build your own Taita day"}</Link>
          {mine && <form action={async () => { "use server"; await deletePlan(plan.id); }}><button type="submit" className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm text-stone underline underline-offset-4">Delete this plan</button></form>}
        </div>
      </div>
    </div>
  );
}
