import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcon";
import { purgeErrorsNow } from "@/lib/actions/errors";
import { ERROR_PAGE_SIZE, ago, buildErrorWhere, errorListHref, parseErrorQuery, type ErrorStatusFilter } from "@/lib/error-admin";
import { EVENT_DAYS, ISSUE_DAYS } from "@/lib/error-scrub";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";

export const dynamic = "force-dynamic";

const pill = "rounded-full px-2.5 py-0.5 font-body text-[0.75rem] font-bold leading-snug";
const TABS: { key: ErrorStatusFilter; label: string }[] = [{ key: "open", label: "Open" }, { key: "resolved", label: "Resolved" }, { key: "ignored", label: "Ignored" }, { key: "all", label: "All" }];

export default async function ErrorLogPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  await requireManagerPage();
  const q = parseErrorQuery(sp); const now = new Date(); const where = buildErrorWhere(q, now);
  const [issues, total, groups] = await Promise.all([
    prisma.errorIssue.findMany({ where: where as never, orderBy: [{ lastSeen: "desc" }], skip: (q.page - 1) * ERROR_PAGE_SIZE, take: ERROR_PAGE_SIZE }),
    prisma.errorIssue.count({ where: where as never }),
    prisma.errorIssue.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const by = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0; const counts: Record<ErrorStatusFilter, number> = { open: by("OPEN"), resolved: by("RESOLVED"), ignored: by("IGNORED"), all: groups.reduce((n, g) => n + g._count._all, 0) };
  const pages = Math.max(1, Math.ceil(total / ERROR_PAGE_SIZE)); const filtered = !!(q.q || q.source || q.range);

  return (
    <div className="flex max-w-[74rem] flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.875rem] font-medium leading-[1.15] tracking-tight text-stone">Error log</h1>
        <p className="mt-2 max-w-[44rem] font-body text-sm leading-relaxed text-admin-muted">Things that went wrong for real visitors and staff, in their browsers and on our server. The same failure is one line with a count, and one that comes back after you marked it resolved opens again. Reports hold <strong className="text-stone">no personal details</strong>: web addresses are kept without anything after a question mark, and emails, phone numbers and codes are removed before saving. Each occurrence is kept for {EVENT_DAYS} days.</p>
      </div>

      <nav aria-label="Show errors that are" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const on = q.status === t.key;
          return <Link key={t.key} href={errorListHref({ ...q, status: t.key, page: 1 })} aria-current={on ? "page" : undefined} className={`focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-body text-sm font-semibold ${on ? "border-stone bg-stone text-parchment" : "border-admin-border bg-white text-stone hover:bg-admin-ground"}`}>{t.label}<span className={`${on ? "text-parchment/80" : "text-admin-muted"} font-medium`}>{counts[t.key]}</span></Link>;
        })}
      </nav>

      <form method="get" role="search" className="flex flex-wrap items-end gap-3 rounded-[10px] border border-admin-border bg-white p-4">
        {q.status !== "open" && <input type="hidden" name="status" value={q.status} />}
        <label className="flex min-w-[15rem] flex-[2_1_15rem] flex-col gap-1 font-body text-sm font-semibold">Search<input name="q" defaultValue={q.q} maxLength={100} placeholder="A message, a page, or a Reference code" className="focus-ring h-11 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-normal" /></label>
        <label className="flex flex-col gap-1 font-body text-sm font-semibold">Where<select name="source" defaultValue={q.source} className="focus-ring h-11 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-normal"><option value="">Browser and server</option><option value="browser">In the browser</option><option value="server">On our server</option></select></label>
        <label className="flex flex-col gap-1 font-body text-sm font-semibold">Seen<select name="range" defaultValue={q.range} className="focus-ring h-11 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-normal"><option value="">Any time</option><option value="24h">In the last 24 hours</option><option value="7d">In the last 7 days</option><option value="30d">In the last 30 days</option></select></label>
        <button type="submit" className="focus-ring h-11 rounded-lg bg-stone px-5 font-body text-sm font-semibold text-parchment hover:bg-rust-deep">Search</button>
        {filtered && <Link href={errorListHref({ status: q.status })} className="focus-ring inline-flex min-h-11 items-center font-body text-sm font-semibold underline underline-offset-[3px]">Clear</Link>}
      </form>

      {issues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[10px] border border-admin-border bg-white px-6 py-12 text-center">
          <AdminIcon name="check" size={34} className="text-canopy" />
          <p className="font-body text-base font-bold">{filtered ? "No errors match that." : q.status === "open" ? "No open errors." : "Nothing here."}</p>
          <p className="max-w-[26rem] font-body text-[0.84375rem] leading-snug text-admin-muted">{filtered ? "Try a wider search, or clear the filters." : "When something goes wrong for a visitor or on the server, it will appear here."}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[10px] border border-admin-border bg-white">
          {issues.map((i, n) => {
            const isNew = i.status === "OPEN" && now.getTime() - i.firstSeen.getTime() < 24 * 3600_000; const back = i.status === "OPEN" && i.regressions > 0;
            return (
              <li key={i.id} className={n > 0 ? "border-t border-admin-line" : ""}>
                <Link href={`/admin/errors/${i.id}`} className="focus-ring flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4 hover:bg-[#F8F6F0]">
                  <span className="min-w-0 flex-[1_1_18rem]">
                    <span className="block break-words font-body text-[0.9375rem] font-semibold leading-snug">{i.message}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`${pill} ${i.source === "SERVER" ? "bg-stone text-parchment" : "bg-admin-sel text-stone"}`}>{i.source === "SERVER" ? "Server" : "Browser"}</span>
                      {isNew && <span className={`${pill} bg-admin-alert text-rust-deep`}>New</span>}
                      {back && <span className={`${pill} bg-rust text-white`}>Back again</span>}
                      {i.status === "RESOLVED" && <span className={`${pill} bg-canopy/10 text-canopy`}>Resolved</span>}
                      {i.status === "IGNORED" && <span className={`${pill} bg-admin-sel text-admin-muted`}>Ignored</span>}
                      <span className="break-all font-body text-[0.8rem] text-admin-muted">{i.route ?? ""}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right"><span className="font-body text-lg font-bold leading-none tabular-nums">{i.count}<span className="sr-only"> times</span></span><span className="font-body text-[0.8rem] text-admin-muted">last {ago(i.lastSeen, now)}</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="More errors" className="flex items-center justify-between gap-3">
          {q.page > 1 ? <Link href={errorListHref({ ...q, page: q.page - 1 })} className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-admin-border bg-white px-4 font-body text-sm font-semibold hover:bg-admin-ground">Newer</Link> : <span />}
          <span className="font-body text-sm text-admin-muted">Page {q.page} of {pages}</span>
          {q.page < pages ? <Link href={errorListHref({ ...q, page: q.page + 1 })} className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-admin-border bg-white px-4 font-body text-sm font-semibold hover:bg-admin-ground">Older</Link> : <span />}
        </nav>
      )}

      <form action={purgeErrorsNow} className="flex flex-wrap items-center gap-3 border-t border-admin-line pt-5">
        <p className="min-w-0 flex-[1_1_20rem] font-body text-[0.8rem] leading-snug text-admin-muted">Old reports are removed automatically every day: each occurrence after {EVENT_DAYS} days, and an error not seen for {ISSUE_DAYS} days.</p>
        <button type="submit" className="focus-ring min-h-11 rounded-lg border border-stone bg-white px-4 font-body text-sm font-semibold hover:bg-admin-ground">Tidy old reports now</button>
      </form>
    </div>
  );
}
