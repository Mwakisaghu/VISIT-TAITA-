import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import PlanBuilder from "@/components/plan/PlanBuilder";
import { deletePlan } from "@/lib/actions/plan";
import { authOptions } from "@/lib/auth";
import { addDays, dayLabel, todayIn } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Build your Taita day",
  description: "Pick a day, add a hike, a market, a match and a place to stay, and see whether the day works.",
};
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const now = new Date(); const today = todayIn(now); const session = await getServerSession(authOptions);
  const plans = session?.user?.id ? await prisma.dayPlan.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, token: true, title: true, day: true, _count: { select: { stops: true } } } }) : [];
  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Plan</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">Build your Taita day.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Pick a day, add what you would like to do, and see whether it fits. Nothing is booked until you book it.</p>
          </div>
        </div>
      </section>
      <section className="px-6 pb-16 pt-6"><div className="mx-auto max-w-6xl"><PlanBuilder defaultDay={addDays(today, 1)} minDay={today} maxDay={addDays(today, 365)} /></div></section>
      {plans.length > 0 && (
        <section aria-labelledby="mine-title" className="px-6 pb-20"><div className="mx-auto max-w-6xl border-t border-stone/10 pt-10">
          <h2 id="mine-title" className="font-display text-3xl text-stone">Your plans</h2>
          <ul className="mt-6 divide-y divide-stone/10 border-y border-stone/10">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div><p className="font-display text-lg text-stone">{p.title}</p><p className="font-body text-sm text-stone/80">{dayLabel(p.day)} · {p._count.stops} {p._count.stops === 1 ? "stop" : "stops"}</p></div>
                <div className="flex items-center gap-3">
                  <Link href={`/plan/${p.token}`} className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Open<span className="sr-only"> {p.title}</span></Link>
                  <form action={async () => { "use server"; await deletePlan(p.id); }}><button type="submit" className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm text-stone underline underline-offset-4">Delete<span className="sr-only"> {p.title}</span></button></form>
                </div>
              </li>
            ))}
          </ul>
        </div></section>
      )}
    </div>
  );
}
