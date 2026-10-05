import Link from "next/link";
import { EmailRowActions, RetryDueButton } from "@/components/admin/EmailActions";
import { MAX_ATTEMPTS, describeWait, emailHealth } from "@/lib/email-retry";
import { prisma } from "@/lib/prisma";

const TABS = [
  { key: "attention", label: "Needs attention" },
  { key: "sent", label: "Sent" },
  { key: "all", label: "All recent" },
] as const;

function Banner({ tone, title, children }: { tone: "bad" | "warn" | "good"; title: string; children: React.ReactNode }) {
  const styles = {
    bad: "border-rust/40 bg-rust/10",
    warn: "border-ochre/50 bg-ochre/10",
    good: "border-canopy/30 bg-canopy/10",
  }[tone];
  return (
    <div className={`rounded-sm border p-4 ${styles}`}>
      <p className="font-body text-sm font-semibold text-stone">{title}</p>
      <div className="mt-1 font-body text-sm text-stone/80">{children}</div>
    </div>
  );
}

export default async function AdminEmailsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "attention";
  const health = emailHealth(process.env);
  const now = new Date();

  const where = tab === "attention" ? { status: { in: ["PENDING", "FAILED"] as ("PENDING" | "FAILED")[] } } : tab === "sent" ? { status: "SENT" as const } : {};

  const [grouped, rows] = await Promise.all([
    prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      // Message bodies are never loaded here — they can contain an enquirer's details.
      select: { id: true, to: true, subject: true, status: true, attempts: true, lastError: true, nextAttemptAt: true, sentAt: true, createdAt: true },
    }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const attention = (counts.get("PENDING") ?? 0) + (counts.get("FAILED") ?? 0);
  const tabCount = { attention, sent: counts.get("SENT") ?? 0, all: attention + (counts.get("SENT") ?? 0) };

  const allGood = health.configured && !health.testSender && health.cronEnabled;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-stone">Emails</h1>
          <p className="mt-2 max-w-prose font-body text-sm text-stone/60">
            Every notification — enquiries to hosts, vouchers to partners, decisions to creators — is recorded here, retried if it fails, and
            cleared once delivered. Message text is never shown or kept after delivery.
          </p>
        </div>
        <RetryDueButton />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {!health.configured && (
          <Banner tone="bad" title="Email isn't configured">
            <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> aren&apos;t both set, so notifications are being skipped and nothing is queued.
          </Banner>
        )}
        {health.configured && health.testSender && (
          <Banner tone="warn" title="You're using Resend's test sender">
            It only delivers to your own Resend account address, so emails to hosts, partners and creators will be refused. They appear below with the
            reason and will retry. Verify a domain at resend.com and set <code>EMAIL_FROM</code> to an address on it before launch.
          </Banner>
        )}
        {!health.cronEnabled && (
          <Banner tone="warn" title="Automatic retries are off">
            Set <code>CRON_SECRET</code> and schedule <code>GET /api/cron/emails</code> with the header <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code> (see
            the README). Until then, use &quot;Retry due now&quot;.
          </Banner>
        )}
        {allGood && <Banner tone="good" title="Email is configured and automatic retries are on" >Failures will show below with the provider&apos;s reason.</Banner>}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/emails?tab=${t.key}`}
            className={`focus-ring rounded-full border px-4 py-1.5 font-body text-sm transition-colors ${
              tab === t.key ? "border-rust bg-rust text-parchment" : "border-stone/20 text-stone hover:border-rust hover:text-rust"
            }`}
          >
            {t.label} ({tabCount[t.key]})
          </Link>
        ))}
      </div>

      <div className="mt-6 divide-y divide-stone/10">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
            <div className="min-w-0 max-w-2xl">
              <p className="font-body text-xs text-stone/50">
                {r.status === "SENT" ? (
                  <span className="text-canopy">Sent</span>
                ) : r.status === "PENDING" ? (
                  <span className="text-ochre">
                    Retrying · attempt {r.attempts} of {MAX_ATTEMPTS}
                    {r.nextAttemptAt ? ` · next try ${describeWait(r.nextAttemptAt.getTime() - now.getTime())}` : ""}
                  </span>
                ) : (
                  <span className="text-rust">Gave up after {r.attempts} attempts</span>
                )}{" "}
                · {r.createdAt.toLocaleString()}
              </p>
              <p className="font-display text-lg text-stone">{r.subject}</p>
              <p className="font-body text-sm text-stone/60">To: {r.to.join(", ")}</p>
              {r.status !== "SENT" && r.lastError && <p className="mt-1 font-body text-xs text-rust">Last error: {r.lastError}</p>}
            </div>
            <EmailRowActions id={r.id} status={r.status} />
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 font-body text-stone/50">{tab === "attention" ? "Nothing needs attention — every email has been delivered." : "Nothing here yet."}</p>
        )}
      </div>
    </div>
  );
}
