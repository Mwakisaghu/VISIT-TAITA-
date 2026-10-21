import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcon";

export type QuickLink = { href: string; label: string };

/** The things people do most: make something new (buttons, with a plus), and, for managers, two links for looking after accounts, kept apart because they are a different kind of action. */
export default function QuickActions({ create, manage }: { create: QuickLink[]; manage: QuickLink[] }) {
  return (
    <section aria-labelledby="quick-title" className="flex flex-col gap-3">
      <h2 id="quick-title" className="font-body text-[1.0625rem] font-bold leading-tight">Quick actions</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {create.map((q) => (
          <Link key={q.href} href={q.href} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone bg-white px-4 font-body text-sm font-semibold hover:bg-admin-ground"><AdminIcon name="plus" size={16} />{q.label}</Link>
        ))}
        {manage.length > 0 && <span aria-hidden="true" className="hidden flex-1 sm:block" />}
        {manage.map((q) => <Link key={q.href} href={q.href} className="focus-ring inline-flex min-h-11 items-center rounded font-body text-sm font-semibold underline underline-offset-[3px]">{q.label}</Link>)}
      </div>
    </section>
  );
}
