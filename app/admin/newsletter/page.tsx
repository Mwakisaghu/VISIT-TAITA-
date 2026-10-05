import Link from "next/link";
import { DeleteDraftButton, ReconfirmButton, SendNextBatchButton } from "@/components/admin/NewsletterActions";
import NewsletterComposer from "@/components/admin/NewsletterComposer";
import { checkinBaseUrl, isLocalUrl } from "@/lib/checkin-url";
import { emailHealth } from "@/lib/email-retry";
import { prisma } from "@/lib/prisma";
import { readSiteInfo } from "@/lib/site-info";

function Banner({ tone, title, children }: { tone: "bad" | "warn"; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-sm border p-4 ${tone === "bad" ? "border-rust/40 bg-rust/10" : "border-ochre/50 bg-ochre/10"}`}>
      <p className="font-body text-sm font-semibold text-stone">{title}</p>
      <div className="mt-1 font-body text-sm text-stone/80">{children}</div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-stone/15 p-4">
      <p className="font-display text-3xl text-stone">{value.toLocaleString("en-GB")}</p>
      <p className="mt-1 font-body text-xs text-stone/60">{label}</p>
    </div>
  );
}

export default async function AdminNewsletterPage({ searchParams }: { searchParams: { edit?: string } }) {
  const health = emailHealth(process.env);
  const info = readSiteInfo();
  const base = checkinBaseUrl();
  const publicBase = !!base && !isLocalUrl(base);

  // Why sending is blocked right now, if it is — shown on the Send button itself.
  const sendBlockReason = !health.configured
    ? "Email isn't configured, so nothing can be sent."
    : health.testSender
      ? "You're still on Resend's test sender, which only delivers to your own address. Verify your domain and set EMAIL_FROM first."
      : !publicBase
        ? "NEXT_PUBLIC_APP_URL must be your public address, so the unsubscribe link in every email works."
        : null;

  const [grouped, legacyCount, sendableCount, campaigns, recent] = await Promise.all([
    prisma.newsletterSubscriber.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.newsletterSubscriber.count({ where: { status: "ACTIVE", confirmedAt: null } }),
    prisma.newsletterSubscriber.count({ where: { status: "ACTIVE", confirmedAt: { not: null }, token: { not: null } } }),
    prisma.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, subject: true, createdAt: true, startedAt: true, recipientCount: true } }),
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, email: true, status: true, confirmedAt: true, createdAt: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));

  const progress = campaigns.length
    ? await prisma.emailLog.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: campaigns.map((c) => c.id) } }, _count: { _all: true } })
    : [];
  const stat = (campaignId: string, status: string) => progress.find((p) => p.campaignId === campaignId && p.status === status)?._count._all ?? 0;

  const editing = searchParams.edit
    ? await prisma.newsletterCampaign.findUnique({ where: { id: searchParams.edit }, select: { id: true, subject: true, body: true, startedAt: true } })
    : null;
  const draft = editing && !editing.startedAt ? editing : null;

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Newsletter</h1>
      <p className="mt-2 max-w-prose font-body text-sm text-stone/60">
        People are only added after they confirm their address by email, and only confirmed subscribers are ever mailed. Every email carries the person&apos;s own unsubscribe link.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {!health.configured && (
          <Banner tone="bad" title="Email isn't configured">
            Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code>. Until then, confirmation emails and newsletters can&apos;t be sent.
          </Banner>
        )}
        {health.configured && health.testSender && (
          <Banner tone="warn" title="You're using Resend's test sender">
            It only delivers to your own address, so a real send is switched off. Verify a domain at resend.com and set <code>EMAIL_FROM</code> to an address on it.
          </Banner>
        )}
        {!publicBase && (
          <Banner tone="warn" title="The site address isn't public">
            Set <code>NEXT_PUBLIC_APP_URL</code> to your real address. Without it the unsubscribe and confirmation links can&apos;t work for anyone else.
          </Banner>
        )}
        {!info.legalName && !info.address && (
          <Banner tone="warn" title="Say who is sending">
            Every newsletter ends with a line naming the sender. Set <code>SITE_LEGAL_NAME</code> and <code>CONTACT_ADDRESS</code> so it isn&apos;t just &quot;Visit Taita&quot;.
          </Banner>
        )}
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Confirmed — will be mailed" value={sendableCount} />
        <Tile label="Waiting to confirm" value={counts.get("PENDING") ?? 0} />
        <Tile label="Unsubscribed" value={counts.get("UNSUBSCRIBED") ?? 0} />
        <Tile label="Never confirmed (older sign-ups)" value={legacyCount} />
      </section>

      {legacyCount > 0 && (
        <section className="mt-6 rounded-sm border border-stone/15 p-5">
          <p className="font-display text-lg text-stone">{legacyCount} older sign-up{legacyCount === 1 ? "" : "s"} never confirmed their address</p>
          <p className="mt-1 max-w-prose font-body text-sm text-stone/70">
            They signed up before confirmation existed, so we can&apos;t be sure the address is theirs and they will <strong>not</strong> be mailed. Ask them to confirm; anyone who doesn&apos;t simply stays off the list.
          </p>
          <div className="mt-4">
            <ReconfirmButton count={Math.min(legacyCount, 200)} />
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">{draft ? "Edit draft" : "Write a newsletter"}</h2>
        <div className="mt-4">
          <NewsletterComposer key={draft?.id ?? "new"} campaign={draft} sendableCount={sendableCount} sendBlockReason={sendBlockReason} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">Newsletters</h2>
        {campaigns.length === 0 ? (
          <p className="mt-3 font-body text-stone/50">None yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-stone/10">
            {campaigns.map((c) => {
              const sentN = stat(c.id, "SENT");
              const waiting = stat(c.id, "PENDING");
              const failed = stat(c.id, "FAILED");
              const state = !c.startedAt ? "Draft" : waiting > 0 ? "Sending" : "Sent";
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-body text-xs text-stone/50">
                      {state}
                      {c.startedAt ? ` · to ${c.recipientCount.toLocaleString("en-GB")} · ${sentN} delivered${waiting ? ` · ${waiting} waiting` : ""}${failed ? ` · ${failed} failed` : ""}` : ""} · {c.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="font-display text-lg text-stone">{c.subject}</p>
                  </div>
                  {state === "Draft" && (
                    <div className="flex items-center gap-4">
                      <Link href={`/admin/newsletter?edit=${c.id}`} className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust">
                        Edit
                      </Link>
                      <DeleteDraftButton id={c.id} />
                    </div>
                  )}
                  {state === "Sending" && <SendNextBatchButton />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">Recent sign-ups</h2>
        {recent.length === 0 ? (
          <p className="mt-3 font-body text-stone/50">Nobody has signed up yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone/10">
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2 font-body text-sm">
                <span className="text-stone">{s.email}</span>
                <span className="text-stone/50">
                  {s.status === "ACTIVE" ? (s.confirmedAt ? "Confirmed" : "Not confirmed (older sign-up)") : s.status === "PENDING" ? "Waiting to confirm" : "Unsubscribed"} ·{" "}
                  {s.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
