import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcon";

export type GlanceStat = { label: string; value: number; href: string };

/** One group of counts: a heading and one tappable row for each (the label, its number, and a chevron). A zero is drawn quieter than a number that is alive. */
export default function GlancePanel({ title, stats }: { title: string; stats: GlanceStat[] }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-[10px] border border-admin-border bg-white">
      <h3 className="px-5 pb-3 pt-4 font-body text-sm font-bold leading-snug">{title}</h3>
      {stats.map((s) => {
        const zero = s.value === 0;
        return (
          <Link key={s.label} href={s.href} className="focus-ring flex min-h-[2.875rem] items-center gap-3 border-t border-admin-line px-5 py-1.5 hover:bg-[#F8F6F0]">
            <span className={`min-w-0 flex-1 font-body text-sm leading-snug ${zero ? "text-admin-muted" : "text-stone"}`}>{s.label}</span>
            <span className={`font-body text-xl leading-none tabular-nums ${zero ? "font-medium text-admin-faint" : "font-bold text-stone"}`}>{s.value}</span>
            <AdminIcon name="chev" size={16} className="text-admin-faint" />
          </Link>
        );
      })}
    </section>
  );
}
