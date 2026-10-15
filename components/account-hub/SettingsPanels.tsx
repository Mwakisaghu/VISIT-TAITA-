import Link from "next/link";
import DeleteAccountForm from "@/components/account/DeleteAccountForm";
import UnsubscribeButton from "@/components/account/UnsubscribeButton";
import Icon, { type IconName } from "@/components/account-hub/Icon";
import SignOutButton from "@/components/account-hub/SignOutButton";
import SettingsAccordion from "@/components/account-hub/SettingsAccordion";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { LOCALES, LOCALE_INFO, switchPath } from "@/lib/i18n/config";
import { formatLong } from "@/lib/account-hub-rules";
import { heldChips } from "@/lib/account-hub-text";
import type { AccountHub } from "@/lib/account-hub";

const LINK = "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2 hover:text-stone";

function Row({ label, children, action, first = false }: { label: string; children: React.ReactNode; action?: React.ReactNode; first?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2 sm:min-h-14 ${first ? "" : "border-t border-stone/15"}`}>
      <span className="w-full font-body text-sm font-bold text-stone sm:w-[190px] sm:flex-none sm:text-[0.95rem]">{label}</span>
      <div className="min-w-0 flex-[1_1_220px] font-body text-[0.95rem] text-stone/80">{children}</div>
      {action && <div className="flex min-h-11 items-center">{action}</div>}
    </div>
  );
}

/** One settings section: a tappable row on a phone, an open card on a wide screen. */
function Panel({ id, title, summary, icon, open = false, children }: { id: string; title: string; summary: string; icon: IconName; open?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} data-settings open={open} className="rounded border border-stone/15 bg-[#F6F0DF]">
      <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 lg:min-h-0 lg:px-6 lg:pb-1 lg:pt-6 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-parchment-dim lg:hidden"><Icon name={icon} size={20} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-display text-lg font-semibold leading-snug text-stone lg:text-[1.45rem]">{title}</h3>
          <span className="font-body text-[0.85rem] text-stone/80 lg:hidden">{summary}</span>
        </span>
        <span className="lg:hidden"><Icon name="chevron" size={18} stroke="#5E574E" width={2} /></span>
      </summary>
      <div className="px-4 pb-3 lg:px-6 lg:pb-6">{children}</div>
    </details>
  );
}

function NewsletterRow({ hub }: { hub: AccountHub }) {
  const l = getLocale(), s = hub.subscriber;
  const label = tr("The Taita letter");
  if (s && s.status === "ACTIVE" && s.confirmedAt) return <Row label={label} action={<UnsubscribeButton />}>{tr("Stories and events from Taita. Subscribed since {date}.", { date: formatLong(s.confirmedAt, l) })}</Row>;
  if (s && s.status === "PENDING") return <Row label={label} action={<UnsubscribeButton />}>{tr("We emailed you a link to confirm your address. Open it to start receiving the letter.")}</Row>;
  if (s && s.status === "ACTIVE") return <Row label={label} action={<UnsubscribeButton />}>{tr("You signed up before we asked people to confirm, so we will not email you until you do. Sign up again from the bottom of any page and we will send you a confirmation link.")}</Row>;
  return <Row label={label}>{tr("You are not subscribed to the Taita letter.")}</Row>;
}

export function SettingsPanels({ hub }: { hub: AccountHub }) {
  const l = getLocale(), u = hub.user, chips = heldChips(hub), newsletterOn = !!hub.subscriber && hub.subscriber.status === "ACTIVE" && !!hub.subscriber.confirmedAt;
  const contact = <Link href={lp("/contact")} className={LINK}>{tr("Contact us to change")}</Link>;
  return (
    <section aria-labelledby="settings-h" className="mb-14 flex flex-col gap-3 lg:gap-[22px]">
      <SettingsAccordion />
      <div className="mb-2">
        <h2 id="settings-h" className="font-display text-[1.7rem] font-semibold leading-tight text-stone sm:text-[2rem]">{tr("Settings")}</h2>
        <p className="mt-1.5 font-body text-[0.95rem] text-stone/80">{tr("Your details, how you sign in, and what we keep.")}</p>
      </div>

      <Panel id="details" title={tr("Your details")} summary={tr("Name, email, terms")} icon="person" open>
        <Row first label={tr("Name")} action={contact}>{u.name}</Row>
        <Row label={tr("Email")} action={contact}>
          <span className="break-words">{u.email}</span>
          <span className={`block text-[0.85rem] font-semibold ${u.emailVerifiedAt ? "text-canopy-deep" : "text-rust-deep"}`}>{u.emailVerifiedAt ? tr("Verified on {date}", { date: formatLong(u.emailVerifiedAt, l) }) : tr("Not verified yet")}</span>
        </Row>
        <Row label={tr("Terms of Use")} action={<Link href={lp("/terms")} className={LINK}>{tr("Read")}</Link>}>
          {u.termsAcceptedAt ? tr("Accepted on {date}, version {version}", { date: formatLong(u.termsAcceptedAt, l), version: u.termsVersion ?? "-" }) : tr("Before we recorded this")}
        </Row>
      </Panel>

      <Panel id="security" title={tr("Sign-in and security")} summary={tr("Password and signing out")} icon="lock">
        <Row first label={tr("Password")} action={<Link href={lp("/forgot-password")} className={LINK}>{tr("Change password")}</Link>}>{tr("We email you a link to choose a new one.")}</Row>
        <Row label={tr("This device")} action={<SignOutButton className={LINK} />}>{tr("You are signed in here.")}</Row>
      </Panel>

      <Panel id="language" title={tr("Language and notifications")} summary={`${LOCALE_INFO[l].native}. ${newsletterOn ? tr("The Taita letter: on") : tr("The Taita letter: off")}`} icon="globe">
        <Row first label={tr("Language")}>
          <ul aria-label={tr("Language")} className="flex flex-wrap gap-2" role="list">
            {LOCALES.map((x) => (
              <li key={x}><a href={switchPath("/account", x)} lang={LOCALE_INFO[x].htmlLang} hrefLang={LOCALE_INFO[x].hreflang} aria-current={x === l ? "true" : undefined} className={`focus-ring inline-flex min-h-11 items-center rounded-full border px-4 font-body text-[0.9rem] font-semibold ${x === l ? "border-stone bg-stone text-parchment" : "border-stone/40 text-stone"}`}>{LOCALE_INFO[x].native}</a></li>
            ))}
          </ul>
        </Row>
        <NewsletterRow hub={hub} />
        <Row label={tr("Booking and ticket emails")}>{tr("Always sent. They are your receipts and reminders for things you have paid for.")}</Row>
      </Panel>

      <Panel id="privacy" title={tr("Privacy and your data")} summary={tr("What we hold, download, delete")} icon="shield">
        <p className="mb-3 max-w-[40rem] font-body text-[0.95rem] text-stone/80">{tr("This is everything linked to your account. We keep your password only as a one-way scramble, so nobody here can read it.")}</p>
        {chips.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2" role="list" aria-label={tr("What we hold")}>
            {chips.map((c) => <li key={c} className="rounded-full bg-parchment-dim px-3.5 py-1 font-body text-sm font-semibold text-stone">{c}</li>)}
          </ul>
        ) : <p className="mb-2 font-body text-sm font-semibold text-stone">{tr("Nothing yet besides your details.")}</p>}
        <Row label={tr("Download my data")} action={<a href="/api/account/export" download className={LINK}>{tr("Download")}</a>}>{tr("A file with your details, Passport, reviews, enquiries and orders, to keep.")}</Row>
        <details className="border-t border-stone/15 py-1.5">
          <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
            <span className="w-full font-body text-sm font-bold text-stone sm:w-[190px] sm:flex-none sm:text-[0.95rem]">{tr("Delete my account")}</span>
            <span className="min-w-0 flex-[1_1_220px] font-body text-[0.95rem] text-stone/80">{tr("Permanently removes your account. See exactly what happens first.")}</span>
            <span className="font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2">{tr("What happens")}</span>
          </summary>
          <div className="flex flex-wrap gap-x-10 gap-y-4 pb-4 pt-2">
            <div className="min-w-0 flex-[1_1_260px]">
              <p className="mb-1.5 font-body font-bold text-stone">{tr("Deleted")}</p>
              <ul className="list-disc space-y-1 pl-5 font-body text-[0.95rem] text-stone/80">
                <li>{tr("Your account, Passport, points, badges and vouchers (unused vouchers are cancelled)")}</li>
                <li>{tr("Your reviews")}</li>
                <li>{tr("Your creator profile, applications and Field Notes, and your missions")}</li>
                <li>{tr("Your newsletter subscription")}</li>
              </ul>
            </div>
            <div className="min-w-0 flex-[1_1_260px]">
              <p className="mb-1.5 font-body font-bold text-stone">{tr("Kept, without your details")}</p>
              <ul className="list-disc space-y-1 pl-5 font-body text-[0.95rem] text-stone/80">
                <li>{tr("Your enquiries, as anonymous records for the host")}</li>
                <li>{tr("Shop orders, as anonymous payment records")}</li>
                <li>{tr("Stories you wrote, without your name")}</li>
              </ul>
            </div>
          </div>
          {hub.blockers.length > 0 ? (
            <div role="note" className="rounded border border-stone/30 bg-parchment-dim p-4">
              <p className="font-body font-bold text-stone">{tr("You can't delete this account just yet")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-[0.95rem] text-stone/80">{hub.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
              <p className="mt-3 font-body text-[0.95rem] text-stone/80">{tr("Need help?")} <Link href={lp("/contact")} className="focus-ring font-bold text-rust-deep underline">{tr("Contact us")}</Link></p>
            </div>
          ) : <DeleteAccountForm />}
          <p className="mt-3 font-body text-sm text-stone/80">{tr("More in our")} <Link href={lp("/privacy")} className="focus-ring font-bold text-rust-deep underline">{tr("Privacy Policy")}</Link>.</p>
        </details>
      </Panel>
    </section>
  );
}
