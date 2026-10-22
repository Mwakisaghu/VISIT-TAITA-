import Link from "next/link";
import { notFound } from "next/navigation";
import AdminIcon from "@/components/admin/AdminIcon";
import { deleteErrorIssue, setErrorStatus } from "@/lib/actions/errors";
import { ago, nairobiTime } from "@/lib/error-admin";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";

export const dynamic = "force-dynamic";

const pill = "rounded-full px-2.5 py-0.5 font-body text-[0.75rem] font-bold leading-snug";
const btn = "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-body text-sm font-semibold";

export default async function ErrorIssuePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireManagerPage();
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) notFound();
  const issue = await prisma.errorIssue.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!issue) notFound();
  const now = new Date(); const latest = issue.events[0]; const open = issue.status === "OPEN";

  return (
    <div className="flex max-w-[74rem] flex-col gap-6">
      <Link href="/admin/errors" className="focus-ring inline-flex min-h-11 w-fit items-center gap-1 rounded font-body text-sm font-semibold underline underline-offset-[3px]"><AdminIcon name="chev" size={14} className="rotate-180" />Error log</Link>
      <div>
        <h1 className="break-words font-body text-[1.375rem] font-bold leading-snug">{issue.message}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`${pill} ${issue.source === "SERVER" ? "bg-stone text-parchment" : "bg-admin-sel text-stone"}`}>{issue.source === "SERVER" ? "Server" : "Browser"}</span>
          <span className={`${pill} ${issue.status === "OPEN" ? "bg-admin-alert text-rust-deep" : issue.status === "RESOLVED" ? "bg-canopy/10 text-canopy" : "bg-admin-sel text-admin-muted"}`}>{issue.status === "OPEN" ? "Open" : issue.status === "RESOLVED" ? "Resolved" : "Ignored"}</span>
          {open && issue.regressions > 0 && <span className={`${pill} bg-rust text-white`}>Back again</span>}
          <span className="break-all font-body text-[0.8rem] text-admin-muted">{issue.kind}{issue.route ? ` · ${issue.route}` : ""}</span>
        </p>
      </div>

      <dl className="grid gap-4 rounded-[10px] border border-admin-border bg-white p-5 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
        <div><dt className="font-body text-[0.78rem] font-semibold text-admin-muted">First seen</dt><dd className="mt-1 font-body text-sm font-semibold">{ago(issue.firstSeen, now)}</dd></div>
        <div><dt className="font-body text-[0.78rem] font-semibold text-admin-muted">Last seen</dt><dd className="mt-1 font-body text-sm font-semibold">{ago(issue.lastSeen, now)}</dd></div>
        <div><dt className="font-body text-[0.78rem] font-semibold text-admin-muted">Times seen</dt><dd className="mt-1 font-body text-sm font-semibold tabular-nums">{issue.count}</dd></div>
        <div><dt className="font-body text-[0.78rem] font-semibold text-admin-muted">Came back after resolving</dt><dd className="mt-1 font-body text-sm font-semibold tabular-nums">{issue.regressions}</dd></div>
        {issue.lastDigest && <div><dt className="font-body text-[0.78rem] font-semibold text-admin-muted">Reference code</dt><dd className="mt-1 break-all font-body text-sm font-semibold">{issue.lastDigest}</dd></div>}
      </dl>
      {issue.note && <p className="rounded-lg bg-admin-sel px-4 py-3 font-body text-sm leading-snug"><strong>Note{issue.resolvedBy ? ` from ${issue.resolvedBy}` : ""}:</strong> {issue.note}</p>}

      <section aria-labelledby="act" className="flex flex-col gap-3 rounded-[10px] border border-admin-border bg-white p-5">
        <h2 id="act" className="font-body text-[1.0625rem] font-bold leading-tight">What now?</h2>
        {open ? (
          <div className="flex flex-wrap items-start gap-4">
            <form action={setErrorStatus} className="flex min-w-[16rem] flex-[1_1_20rem] flex-col gap-2">
              <input type="hidden" name="id" value={issue.id} /><input type="hidden" name="status" value="RESOLVED" />
              <label className="flex flex-col gap-1 font-body text-sm font-semibold">Note (optional)<input name="note" maxLength={300} placeholder="For example: fixed in the last update" className="focus-ring h-11 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-normal" /></label>
              <button type="submit" className={`${btn} bg-stone text-parchment hover:bg-rust-deep`}>Mark as resolved</button>
              <p className="font-body text-[0.8rem] leading-snug text-admin-muted">If it happens again it opens again, marked &ldquo;Back again&rdquo;.</p>
            </form>
            <form action={setErrorStatus} className="flex min-w-[14rem] flex-[1_1_14rem] flex-col gap-2">
              <input type="hidden" name="id" value={issue.id} /><input type="hidden" name="status" value="IGNORED" />
              <label className="flex flex-col gap-1 font-body text-sm font-semibold">Why? (optional)<input name="note" maxLength={300} placeholder="For example: a visitor's old browser" className="focus-ring h-11 rounded-lg border border-admin-border bg-white px-3 font-body text-sm font-normal" /></label>
              <button type="submit" className={`${btn} border border-stone bg-white hover:bg-admin-ground`}>Ignore this error</button>
              <p className="font-body text-[0.8rem] leading-snug text-admin-muted">It is still counted, but no new occurrences are kept and it stays out of the way.</p>
            </form>
          </div>
        ) : (
          <form action={setErrorStatus} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={issue.id} /><input type="hidden" name="status" value="OPEN" />
            <button type="submit" className={`${btn} bg-stone text-parchment hover:bg-rust-deep`}>Open it again</button>
          </form>
        )}
        <details className="border-t border-admin-line pt-3">
          <summary className="focus-ring inline-flex min-h-11 cursor-pointer items-center rounded font-body text-sm font-semibold text-rust-deep">Delete this error</summary>
          <form action={deleteErrorIssue} className="mt-2 flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={issue.id} />
            <label className="flex min-h-11 items-center gap-2 font-body text-sm"><input type="checkbox" name="confirm" value="yes" required className="h-5 w-5" />Delete it and everything recorded about it</label>
            <button type="submit" className={`${btn} bg-rust text-white hover:bg-rust-deep`}>Delete</button>
          </form>
        </details>
      </section>

      {latest?.stack && (
        <section aria-labelledby="trace" className="flex flex-col gap-2">
          <h2 id="trace" className="font-body text-[1.0625rem] font-bold leading-tight">The latest trace</h2>
          <pre className="max-h-[22rem] overflow-auto rounded-[10px] bg-stone p-4 font-mono text-[0.78rem] leading-relaxed text-parchment">{latest.stack}</pre>
          {latest.extra && <p className="break-words font-body text-[0.8rem] text-admin-muted">More: {latest.extra}</p>}
        </section>
      )}

      <section aria-labelledby="events" className="flex flex-col gap-2">
        <h2 id="events" className="font-body text-[1.0625rem] font-bold leading-tight">Recent occurrences</h2>
        {issue.events.length === 0 ? <p className="font-body text-sm text-admin-muted">{issue.status === "IGNORED" ? "None are kept while an error is ignored." : "None are kept any more (old ones are removed after a while)."}</p> : (
          <div className="overflow-x-auto rounded-[10px] border border-admin-border bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-left font-body text-sm">
              <thead><tr className="border-b border-admin-line text-[0.78rem] text-admin-muted"><th scope="col" className="px-4 py-2.5 font-semibold">When (Nairobi)</th><th scope="col" className="px-4 py-2.5 font-semibold">Page</th><th scope="col" className="px-4 py-2.5 font-semibold">Browser</th><th scope="col" className="px-4 py-2.5 font-semibold">Signed in</th><th scope="col" className="px-4 py-2.5 font-semibold">Version</th></tr></thead>
              <tbody>
                {issue.events.map((e) => (
                  <tr key={e.id} className="border-t border-admin-line align-top">
                    <td className="whitespace-nowrap px-4 py-2.5">{nairobiTime(e.createdAt)}</td>
                    <td className="break-all px-4 py-2.5">{e.method ? `${e.method} ` : ""}{e.path}</td>
                    <td className="px-4 py-2.5">{e.browser ?? "Unknown"}</td>
                    <td className="px-4 py-2.5">{e.signedIn ? "Yes" : "No"}</td>
                    <td className="px-4 py-2.5">{e.release ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
