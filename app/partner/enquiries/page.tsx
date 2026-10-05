import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import EnquiryStatusButtons from "@/components/partner/EnquiryStatusButtons";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { REPLY_TEMPLATES, mailtoHref, telHref, whatsappHref } from "@/lib/enquiry-contact";
import { ENQUIRY_STATUS_LABELS, getInbox, getInboxCounts, isEnquiryStatus, type EnquiryStatusValue } from "@/lib/partner-enquiries-data";

export const metadata: Metadata = { title: "Enquiries" };

// Personal to the signed-in host and live — never cached.
export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "New", status: "NEW" as const },
  { key: "contacted", label: "Contacted", status: "CONTACTED" as const },
  { key: "confirmed", label: "Confirmed", status: "CONFIRMED" as const },
  { key: "declined", label: "Declined", status: "DECLINED" as const },
  { key: "all", label: "All", status: null },
];

const CHIP: Record<EnquiryStatusValue, string> = {
  NEW: "bg-rust/10 text-rust",
  CONTACTED: "bg-ochre/20 text-stone",
  CONFIRMED: "bg-canopy/15 text-canopy",
  DECLINED: "bg-stone/10 text-stone/60",
};

const EMPTY: Record<string, string> = {
  new: "No new enquiries — you're all caught up.",
  contacted: "Nothing is waiting on a reply from the guest.",
  confirmed: "No confirmed enquiries yet.",
  declined: "No declined enquiries.",
  all: "No enquiries yet. They'll appear here as soon as someone asks about one of your listings.",
};

const linkBtn =
  "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust";

export default async function PartnerEnquiriesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  const isAdmin = ADMIN_ROLES.includes(user.role);

  if (!isAdmin && user.role !== "PARTNER") {
    return (
      <div>
        <h1 className="font-display text-3xl text-stone">Enquiries</h1>
        <p className="mt-3 max-w-prose font-body text-stone/70">Enquiries are for stay and experience partners. Your dashboard shows your shop products and vouchers.</p>
      </div>
    );
  }

  const tab = TABS.find((t) => t.key === searchParams.tab) ?? TABS[0];
  const [counts, items] = await Promise.all([getInboxCounts(user.id), getInbox(user.id, tab.status)]);
  const total = counts.NEW + counts.CONTACTED + counts.CONFIRMED + counts.DECLINED;
  const countFor = (status: EnquiryStatusValue | null) => (status ? counts[status] : total);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Enquiries</h1>
      <p className="mt-2 max-w-prose font-body text-stone/60">
        People who have asked about your stays and experiences. Reply to them directly — then mark where each one stands, so you and we can see what&apos;s been handled.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partner/enquiries?tab=${t.key}`}
            className={`focus-ring rounded-full border px-4 py-1.5 font-body text-sm transition-colors ${
              t.key === tab.key ? "border-rust bg-rust text-parchment" : "border-stone/20 text-stone hover:border-rust hover:text-rust"
            }`}
          >
            {t.label} ({countFor(t.status)})
          </Link>
        ))}
      </div>

      {isAdmin && total === 0 && (
        <p className="mt-6 max-w-prose font-body text-sm text-stone/60">
          This page shows enquiries for listings <em>you</em> own. As an admin, manage every enquiry under Admin → Stays / Experiences.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-5">
        {items.map((e) => {
          const email = REPLY_TEMPLATES.email(e.name, e.listingName);
          const mail = mailtoHref({ to: e.email, subject: email.subject, body: email.body });
          const call = telHref(e.phone);
          const whatsapp = whatsappHref(e.phone, REPLY_TEMPLATES.whatsapp(e.name, e.listingName));
          return (
            <article key={`${e.kind}-${e.id}`} className="rounded-sm border border-stone/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-body text-xs text-stone/50">
                    {e.kind === "stay" ? "Stay" : "Experience"} · {e.listingName} · {e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="font-display text-xl text-stone">{e.name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 font-body text-xs ${CHIP[e.status]}`}>{ENQUIRY_STATUS_LABELS[e.status]}</span>
              </div>

              <p className="mt-2 font-body text-sm text-stone/70">
                {e.email} · {e.phone}
              </p>

              {e.facts.length > 0 && (
                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
                  {e.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="font-body text-xs text-stone/50">{f.label}</dt>
                      <dd className="font-body text-sm text-stone">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <p className="mt-4 max-w-prose whitespace-pre-line break-words font-body leading-relaxed text-stone/85">{e.message}</p>

              {(mail || call || whatsapp) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {mail && (
                    <a href={mail} className={linkBtn}>
                      Email
                    </a>
                  )}
                  {call && (
                    <a href={call} className={linkBtn}>
                      Call
                    </a>
                  )}
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                      WhatsApp
                    </a>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-stone/10 pt-4">
                <EnquiryStatusButtons kind={e.kind} id={e.id} status={e.status} />
              </div>
            </article>
          );
        })}
        {items.length === 0 && <p className="py-6 font-body text-stone/50">{EMPTY[tab.key]}</p>}
      </div>

      <p className="mt-10 max-w-prose font-body text-xs text-stone/50">
        Guests share their details with you only so you can answer their enquiry. Please use them for nothing else, and don&apos;t pass them on.
      </p>
    </div>
  );
}
