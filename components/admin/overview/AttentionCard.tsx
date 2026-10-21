import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcon";
import type { IconName } from "@/lib/admin-nav";

export type AttentionRow = { key: string; icon: IconName; text: string; href: string };

/** "Needs your attention": each kind of thing waiting, in words, with a way straight to it; or, when nothing is, a plain "All caught up". The bell in the bar links here (#attention). */
export default function AttentionCard({ rows }: { rows: AttentionRow[] }) {
  return (
    <section id="attention" aria-labelledby="attention-title" className="min-w-0 flex-[999_1_30rem] overflow-hidden rounded-[10px] border border-admin-border bg-white">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-full bg-admin-alert text-rust-deep"><AdminIcon name="bell" /></span>
        <h2 id="attention-title" className="min-w-0 flex-1 font-body text-[1.0625rem] font-bold leading-tight">Needs your attention</h2>
        {rows.length > 0 && <span className="shrink-0 rounded-full bg-admin-alert px-2.5 py-1 font-body text-[0.78rem] font-bold text-rust-deep">{rows.length} {rows.length === 1 ? "area" : "areas"}</span>}
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-admin-line px-5 pb-8 pt-7 text-center">
          <AdminIcon name="check" size={34} className="text-canopy" />
          <p className="font-body text-base font-bold">All caught up</p>
          <p className="max-w-[21rem] font-body text-[0.84375rem] leading-snug text-admin-muted">Nothing is waiting for you. New enquiries, applications and reviews show up here as they arrive.</p>
        </div>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-admin-line px-5 py-3.5">
              <span className="flex h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-lg bg-admin-ground"><AdminIcon name={r.icon} size={19} /></span>
              <p className="min-w-0 flex-[1_1_11rem] break-words font-body text-[0.9375rem] font-semibold leading-snug">{r.text}</p>
              <Link href={r.href} className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-stone px-3.5 font-body text-sm font-semibold hover:bg-admin-ground">
                Review<AdminIcon name="chev" size={15} /><span className="sr-only"> {r.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
