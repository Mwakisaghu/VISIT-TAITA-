import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcon";
import type { LaunchItem } from "@/lib/admin-launch";

/** "Before launch": the sample content still showing to visitors, each line a link to where it is managed. Draws nothing when there is none: it disappears by itself once the site is clean. */
export default function LaunchCard({ items }: { items: LaunchItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="launch-title" className="min-w-0 flex-[1_1_19rem] overflow-hidden rounded-[10px] border border-admin-border bg-white">
      <div className="px-5 pb-3 pt-4">
        <h2 id="launch-title" className="font-body text-[1.0625rem] font-bold leading-tight">Before launch</h2>
        <p className="mt-1 font-body text-[0.84375rem] leading-snug text-admin-muted">Sample content that visitors can still see.</p>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            <Link href={i.href} className="focus-ring flex min-h-[2.875rem] items-center gap-3 border-t border-admin-line px-5 py-1.5 hover:bg-[#F8F6F0]">
              <span className="min-w-0 flex-1 break-words font-body text-sm font-semibold leading-snug">{i.text}</span>
              <AdminIcon name="chev" size={16} className="text-admin-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
