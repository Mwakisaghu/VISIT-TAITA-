import Link from "next/link";
import ResendVerificationButton from "@/components/account/ResendVerificationButton";
import Icon from "@/components/account-hub/Icon";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { RIBBON_CUTS, ZONE_CENTRES, formatLong } from "@/lib/account-hub-rules";
import { greeting, type Attention, type Chip, type ComingCard, type Tile } from "@/lib/account-hub-text";
import { readSocial } from "@/lib/social";
import type { AccountHub } from "@/lib/account-hub";

const CARD = "rounded border border-stone/15 bg-[#F6F0DF]";
const KICKER = "font-body text-xs font-bold uppercase tracking-[0.16em] text-rust-deep";
const H2 = "font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]"; // colour is added where it is used (dark text on the page, light text on the green work band)
const BTN = "focus-ring inline-flex min-h-12 items-center justify-center rounded px-5 font-body text-[0.95rem] font-bold";
const LINK = "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2 hover:text-stone";
const CHIP_TONE: Record<Chip["tone"], string> = { good: "bg-canopy text-[#F6F0DF]", info: "bg-ochre-light text-stone", warn: "bg-rust-deep text-white" };

const num = (n: number) => new Intl.NumberFormat({ en: "en-GB", sw: "sw-KE", fr: "fr-FR", de: "de-DE" }[getLocale()]).format(n);

export function SectionTitle({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className={`${H2} text-stone`}>{title}</h2>
      {sub && <p className="mt-1.5 font-body text-[0.95rem] text-stone/80">{sub}</p>}
    </div>
  );
}

const ROLE_LABEL = { host: () => tr("Host"), seller: () => tr("Seller"), events: () => tr("Event manager"), creator: () => tr("Creator"), admin: () => tr("Team") };

/** The top of the page: a greeting and who this account is. The passport card sits beside it. */
export function HubCover({ hub, children }: { hub: AccountHub; children: React.ReactNode }) {
  const l = getLocale();
  return (
    <section className="bg-parchment-dim px-5 pt-10 sm:px-8 sm:pt-12" aria-labelledby="account-title">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-stretch gap-8 pb-10 lg:gap-10 lg:pb-11">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col justify-center">
          <p className={KICKER}>{tr("My account")}</p>
          <h1 id="account-title" className="mt-2.5 font-display text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.01em] text-stone sm:text-[3.4rem]">{greeting(hub)}</h1>
          <p className="mt-3.5 max-w-[34rem] font-body text-[1.05rem] text-stone/80 sm:text-lg">{tr("Everything you have booked, stamped and saved in Taita, in one place.")}</p>
          {hub.work.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={tr("Your roles")}>
              {hub.work.map((k) => <li key={k} className="rounded-full border-[1.5px] border-canopy px-3 py-0.5 font-body text-[0.8rem] font-bold text-canopy-deep">{ROLE_LABEL[k]()}</li>)}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-body text-sm text-stone/80">
            <span>{tr("Member since {date}", { date: formatLong(hub.user.createdAt, l) })}</span>
            {hub.user.emailVerifiedAt ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-canopy-deep"><Icon name="check" size={16} stroke="#1D3126" width={2.4} />{tr("Email verified")}</span>
            ) : (
              <span className="font-bold text-rust-deep">{tr("Email not verified yet")}</span>
            )}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/** The altitude line: every stamp as a dot on Taita's own scale, between the plains, foothills and highlands. */
function AltitudeLine({ hub }: { hub: AccountHub }) {
  const r = hub.ribbon;
  const label = r.dots.length === 0
    ? (r.total === 0 ? tr("Your altitude line is empty. Stamps will appear here, from the plains up to the highlands.") : tr("Your stamps have no recorded height yet."))
    : r.lowest && r.highest && r.lowest.id !== r.highest.id
      ? tr("Your stamps by altitude. The lowest is {low}, {lowM} metres, and the highest is {high}, {highM} metres.", { low: r.lowest.name, lowM: num(r.lowest.altitudeM), high: r.highest.name, highM: num(r.highest.altitudeM) })
      : tr("Your stamp by altitude: {name}, {m} metres.", { name: r.highest!.name, m: num(r.highest!.altitudeM) });
  const zone = (x: number, text: string) => <text key={text} x={x} y={90} textAnchor="middle" fill="#ECE3CD" style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "1.6px" }}>{text.toUpperCase()}</text>;
  return (
    <svg viewBox="0 0 400 96" role="img" aria-label={label} className="block w-full">
      <line x1="0" y1="44" x2="400" y2="44" stroke="#ECE3CD" strokeWidth="1" opacity="0.55" />
      <line x1={RIBBON_CUTS.foothills} y1="14" x2={RIBBON_CUTS.foothills} y2="74" stroke="#E3BC6B" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
      <line x1={RIBBON_CUTS.highlands} y1="14" x2={RIBBON_CUTS.highlands} y2="74" stroke="#E3BC6B" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
      {r.dots.length === 0 && r.total === 0 && <circle cx={ZONE_CENTRES.PLAINS} cy="44" r="7" fill="none" stroke="#E3BC6B" strokeWidth="2" strokeDasharray="3 3" />}
      {r.dots.map((d) => d.top ? <circle key={d.id} cx={d.x} cy="44" r="9" fill="#1D3126" stroke="#E3BC6B" strokeWidth="3" /> : <circle key={d.id} cx={d.x} cy="44" r="6" fill="#E3BC6B" />)}
      {zone(ZONE_CENTRES.PLAINS, tr("Plains"))}{zone(ZONE_CENTRES.FOOTHILLS, tr("Foothills"))}{zone(ZONE_CENTRES.HIGHLANDS, tr("Highlands"))}
    </svg>
  );
}

export function PassportCard({ hub }: { hub: AccountHub }) {
  const r = hub.ribbon, wishes = hub.wishes.length;
  return (
    <section aria-labelledby="passport-h" className="flex min-w-0 flex-[0_1_460px] flex-col gap-3.5 rounded bg-canopy-deep p-5 text-parchment sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="passport-h" className="font-body text-xs font-bold uppercase tracking-[0.18em] text-ochre-light">{tr("Your Passport")}</h2>
        <Link href={lp("/passport")} className="focus-ring inline-flex min-h-11 items-center font-body text-sm font-bold text-ochre-light underline underline-offset-2">{tr("Open my Passport")}</Link>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-[3.4rem] font-semibold leading-none sm:text-[4rem]">{num(r.total)}</span>
        <span className="font-body text-base sm:text-lg">{r.total === 1 ? tr("stamp so far") : tr("stamps so far")}</span>
      </p>
      <AltitudeLine hub={hub} />
      {r.lowest && r.highest && r.lowest.id !== r.highest.id ? (
        <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-body text-sm">
          <span>{tr("Lowest: {name}, {m} m", { name: r.lowest.name, m: num(r.lowest.altitudeM) })}</span>
          <span>{tr("Highest: {name}, {m} m", { name: r.highest.name, m: num(r.highest.altitudeM) })}</span>
        </p>
      ) : r.highest ? <p className="font-body text-sm">{tr("Stamped: {name}, {m} m", { name: r.highest.name, m: num(r.highest.altitudeM) })}</p> : null}
      {r.total === 0 ? (
        <>
          <p className="font-body text-[0.95rem]">{tr("Check in at a place in Taita to earn your first stamp. Your line fills as you climb from the plains to the highlands.")}</p>
          <Link href={lp("/map")} className={`${BTN} bg-ochre-light text-stone`}>{tr("Find a place on the map")}</Link>
        </>
      ) : (
        <p className="border-t border-parchment/30 pt-3 font-body text-sm">
          {wishes === 0 ? tr("Save places you want to visit and they will wait here.") : wishes === 1 ? tr("1 place on your want-to-go list.") : tr("{n} places on your want-to-go list.", { n: wishes })}
          {hub.next && <> {tr("Next to stamp:")} <Link href={lp(`/map?place=${hub.next.slug}`)} className="focus-ring font-bold text-ochre-light underline underline-offset-2">{hub.next.name}</Link></>}
        </p>
      )}
    </section>
  );
}

export function AttentionCards({ items }: { items: Attention[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="attention-h" className="mb-12">
      <h2 id="attention-h" className="sr-only">{tr("Needs your attention")}</h2>
      <div className="flex flex-col gap-3">
        {items.map((a) => (
          <article key={a.key} className={`flex flex-col gap-2.5 rounded p-5 text-stone ${a.key === "payout" ? CARD : "bg-ochre-light"}`}>
            <h3 className="font-display text-[1.35rem] font-semibold leading-snug">{a.title}</h3>
            <p className="font-body text-[0.95rem]">{a.body}</p>
            {a.key === "verify" ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <ResendVerificationButton />
                <Link href={lp("/contact")} className="focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-semibold underline underline-offset-2">{tr("Wrong address? Contact us")}</Link>
              </div>
            ) : a.action ? (
              <Link href={a.action.href} className={`${BTN} mt-1 self-start ${a.key === "payout" ? "border-2 border-stone text-stone" : "bg-stone text-parchment"}`}>{a.action.label}</Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ComingUp({ cards }: { cards: ComingCard[] }) {
  return (
    <section aria-labelledby="comingup-h" className="mb-14">
      <SectionTitle id="comingup-h" title={tr("Coming up")} sub={tr("What is booked, paid for or on its way.")} />
      {cards.length === 0 ? (
        <div className="flex flex-col gap-2.5 rounded border-2 border-dashed border-stone/35 p-5 sm:max-w-xl sm:p-6">
          <h3 className="font-display text-[1.3rem] font-semibold leading-snug">{tr("Nothing booked yet")}</h3>
          <p className="font-body text-[0.95rem] text-stone/80">{tr("Walks, stays and events you book will appear here, with their status and what to do next.")}</p>
          <Link href={lp("/experiences")} className={`${BTN} mt-1 self-start bg-rust text-white`}>{tr("Browse experiences")}</Link>
          <Link href={lp("/events")} className={LINK}>{tr("See what is on at Taita Week")}</Link>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3 lg:gap-[18px]" role="list">
          {cards.map((c) => (
            <li key={c.key} className={`${CARD} flex flex-col gap-2.5 p-5 lg:p-[22px]`}>
              <div className="flex items-center justify-between gap-2">
                <p className={KICKER}>{c.kicker}</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-[0.78rem] font-bold ${CHIP_TONE[c.chip.tone]}`}>{c.chip.text}</span>
              </div>
              <h3 className="font-display text-[1.3rem] font-semibold leading-snug">{c.title}</h3>
              <p className="font-body text-[0.95rem] text-stone/80">{c.detail}</p>
              <Link href={c.action.href} className={`${LINK} mt-auto`}>{c.action.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Every part of the account as one consistent card: an icon, a name, and what is happening there. */
export function HubTiles({ id, title, sub, tiles, onDark = false }: { id: string; title: string; sub?: string; tiles: Tile[]; onDark?: boolean }) {
  return (
    <section aria-labelledby={id} className={onDark ? "" : "mb-14"}>
      <div className="mb-5">
        <h2 id={id} className={`${H2} ${onDark ? "text-parchment" : "text-stone"}`}>{title}</h2>
        {sub && <p className={`mt-1.5 font-body text-[0.95rem] ${onDark ? "text-parchment" : "text-stone/80"}`}>{sub}</p>}
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-3.5" role="list">
        {tiles.map((t) => (
          <li key={t.key} className="min-w-0">
            <Link href={t.href} className="focus-ring flex h-full min-h-[132px] flex-col gap-2.5 rounded border border-stone/15 bg-[#F6F0DF] p-4 text-stone no-underline lg:min-h-[88px] lg:flex-row lg:items-center lg:gap-3.5">
              <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-parchment-dim lg:h-12 lg:w-12"><Icon name={t.icon} size={22} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-[1.1rem] font-semibold leading-snug">{t.title}</span>
                <span className="font-body text-[0.85rem] leading-snug text-stone/80 lg:text-sm">{t.status}</span>
              </span>
              <span className="hidden lg:block"><Icon name="chevron" size={18} stroke="#5E574E" width={2} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkBand({ band }: { band: { title: string; intro: string; tiles: Tile[] } | null }) {
  if (!band) return null;
  return (
    <div className="-mx-5 mb-14 bg-canopy-deep px-5 py-8 sm:-mx-8 sm:px-8 lg:mx-0 lg:rounded">
      <HubTiles id="work-h" title={band.title} sub={band.intro} tiles={band.tiles} onDark />
    </div>
  );
}

export function HelpBand() {
  const wa = readSocial().whatsapp;
  return (
    <section id="help" aria-labelledby="help-h" className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded bg-canopy-deep p-6 text-parchment sm:p-7">
      <div className="min-w-0 flex-[1_1_300px]">
        <h2 id="help-h" className="font-display text-[1.6rem] font-semibold">{tr("Need a hand?")}</h2>
        <p className="mt-1 font-body text-base">{tr("A real person in Taita answers. Tell us what you were trying to do.")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {wa && <a href={wa.link()} className={`${BTN} bg-ochre-light text-stone`}>{tr("Chat on WhatsApp")}</a>}
        <Link href={lp("/contact")} className={`${BTN} border-2 border-parchment text-parchment`}>{tr("Contact us")}</Link>
      </div>
    </section>
  );
}

/** The desktop list of every part of the account, always one click away. */
export function AccountRail({ tiles }: { tiles: Tile[] }) {
  const item = "focus-ring flex min-h-11 items-center gap-3 rounded px-3 font-body text-[0.95rem] font-semibold"; // colours are added per use: two competing text colours on one element once made the current item unreadable
  const group = "mb-1.5 mt-0 font-body text-xs font-bold uppercase tracking-[0.16em] text-stone/80";
  const settings: { id: string; label: string; icon: "person" | "lock" | "globe" | "shield" }[] = [
    { id: "details", label: tr("Your details"), icon: "person" }, { id: "security", label: tr("Sign-in and security"), icon: "lock" },
    { id: "language", label: tr("Language and notifications"), icon: "globe" }, { id: "privacy", label: tr("Privacy and your data"), icon: "shield" },
  ];
  return (
    <nav aria-label={tr("My account")} className="hidden w-[232px] flex-none flex-col gap-0.5 self-start lg:sticky lg:top-24 lg:flex">
      <p className={group}>{tr("My Taita")}</p>
      <Link href={lp("/account")} aria-current="page" className={`${item} bg-stone text-parchment`}><Icon name="overview" size={20} stroke="#ECE3CD" width={1.7} />{tr("Overview")}</Link>
      {tiles.map((t) => <Link key={t.key} href={t.href} className={`${item} text-stone`}><Icon name={t.icon} size={20} stroke="#1B1815" />{t.title}</Link>)}
      <p className={`${group} mt-5`}>{tr("Settings")}</p>
      {settings.map((s) => <a key={s.id} href={`#${s.id}`} className={`${item} text-stone`}><Icon name={s.icon} size={20} stroke="#1B1815" />{s.label}</a>)}
      <p className={`${group} mt-5`}>{tr("Need help?")}</p>
      <a href="#help" className={`${item} text-rust-deep`}>{tr("WhatsApp or contact us")}</a>
    </nav>
  );
}
