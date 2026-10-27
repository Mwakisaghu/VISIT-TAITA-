import type { Metadata } from "next";
import Link from "next/link";
import StoryCredits from "@/components/stories/StoryCredits";
import ShareBar from "@/components/share/ShareBar";
import EssentialsNav from "@/components/essentials/EssentialsNav";
import { EssentialsIcon, type IconName } from "@/components/essentials/Icons";
import MonthStrip from "@/components/essentials/MonthStrip";
import { LOCALE_INFO, hreflangLinks, localizePath } from "@/lib/i18n/config";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { EMERGENCY, KRC_URL, KWS_TEL, KWS_URL, LAST_CHECKED, SEASON_BY_MONTH, SECTIONS, SOURCES } from "@/app/essentials/content";
import { shareMeta } from "@/lib/share-meta";
import { getSiteUrl } from "@/lib/site-url";


/** The page's own title and description (in the visitor's language), a share preview, and its language links: it exists in all four languages, so it says so. */
export function generateMetadata(): Metadata {
  const locale = getLocale(); const site = getSiteUrl(); const links = hreflangLinks("/essentials", site, ["sw", "fr", "de"]);
  const title = tr("Visitor essentials"); const description = tr("How to get to Taita Taveta, when to go, how to pay and how to stay safe.");
  const own = site.replace(/\/+$/, "") + localizePath("/essentials", locale);
  return { title, description, ...shareMeta(title, description), alternates: { canonical: own, languages: Object.fromEntries(links.map((l) => [l.hreflang, l.href])) } };
}

const BTN = "focus-ring inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[2px] px-7 font-body text-[0.75rem] font-bold uppercase tracking-[0.2em]";
const CARD = "rounded-[4px] border border-stone/15 bg-[#FBF7EA]";
const H2 = "font-display text-3xl font-medium text-stone sm:text-4xl";
const points = (id: string): readonly string[] => SECTIONS.find((s) => s.id === id)!.points;
const titleOf = (id: string) => SECTIONS.find((s) => s.id === id)!.title;

/** A link to another website: it opens in a new tab (so the guide stays open), says so to a screen reader, and never hands the visitor's page to the other site. */
function Ext({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}<span className="sr-only"> {tr("(opens in a new tab)")}</span></a>;
}
function Row({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 border-b border-stone/15 py-5">
      <EssentialsIcon name={icon} size={26} className="mt-0.5 shrink-0 text-rust-deep" />
      <div><h3 className="font-body text-[1.05rem] font-bold text-stone">{title}</h3><div className="mt-1 max-w-prose font-body text-base leading-relaxed text-stone/90">{children}</div></div>
    </li>
  );
}
function Step({ name, children, filled, last }: { name: string; children: React.ReactNode; filled?: boolean; last?: boolean }) {
  return (
    <li className={`relative flex gap-4 ${last ? "" : "pb-5"}`}>
      <span aria-hidden="true" className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ochre-light ${filled ? "bg-ochre-light" : ""}`} />
      {!last && <span aria-hidden="true" className="absolute bottom-[-4px] left-[6px] top-6 w-0.5 bg-ochre-light/40" />}
      <div><p className="font-body text-[1.05rem] font-bold text-parchment">{name}</p><p className="font-body text-[0.95rem] leading-relaxed text-parchment/85">{children}</p></div>
    </li>
  );
}

export default function EssentialsPage() {
  const locale = getLocale(); const lang = LOCALE_INFO[locale].htmlLang;
  const month = (m: number, style: "long" | "short") => { const s = new Intl.DateTimeFormat(lang, { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 1))); return s.charAt(0).toLocaleUpperCase(lang) + s.slice(1); };
  const months = Array.from({ length: 12 }, (_, m) => ({ name: month(m, "long"), short: month(m, "short"), season: SEASON_BY_MONTH[m] }));
  const seasons = { dry: { title: tr("Dry seasons"), body: tr(points("when-to-go")[0]) }, long: { title: tr("Long rains"), body: tr(points("when-to-go")[1]) }, short: { title: tr("Short rains"), body: tr(points("when-to-go")[2]) } };
  const getting = points("getting-here"); const when = points("when-to-go"); const money = points("money"); const safe = points("staying-safe");
  const facts: [string, string][] = [
    [tr("Drive from Nairobi"), tr("About seven hours")], [tr("Nearest station"), "Voi (SGR)"],
    [tr("Driest months"), `${month(5, "short")}–${month(9, "short")}, ${month(0, "short")}–${month(1, "short")}`], [tr("Pay with"), tr("KES and M-Pesa")],
  ];
  return (
    <div className="pb-24 md:pb-0">
      <section className="bg-stone px-6 pb-24 pt-10 text-parchment sm:pb-28 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_460px] lg:items-start lg:gap-16">
          <div>
            <nav aria-label={tr("Breadcrumb")} className="font-body text-[0.8rem] text-parchment/85"><Link href={lp("/plan")} className="focus-ring text-ochre-light underline underline-offset-2">{tr("Plan")}</Link> / <span>{tr("Visitor essentials")}</span></nav>
            <p className="mt-8 font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ochre-light">{tr("Visitor essentials")}</p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.08] sm:text-5xl">{tr("Everything you need")}<br />{tr("before you come.")}</h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-parchment/90">{tr("The practical things people ask most: how to get here, when to go, how to pay and how to stay safe.")}</p>
            <p className="mt-6 flex items-start gap-2 font-body text-sm text-ochre-light"><EssentialsIcon name="check" size={20} className="mt-0.5 shrink-0" /><span>{tr("Last checked in {when}. Details change, so confirm before you travel.", { when: tr(LAST_CHECKED) })}</span></p>
          </div>
          <aside aria-labelledby="journey-title" className="rounded-[4px] border border-parchment/20 bg-stone-soft p-6">
            <div className="flex items-baseline justify-between gap-3"><h2 id="journey-title" className="font-display text-2xl font-semibold">{tr("The journey from Nairobi")}</h2><span className="shrink-0 font-body text-[0.8rem] text-parchment/85">{tr("about 400 km")}</span></div>
            <ol className="mt-5">
              <Step name="Nairobi">{tr("Drive yourself (around seven hours), or take a coach or the SGR train.")}</Step>
              <Step name="Voi">{tr("The county's largest town. The SGR station is outside town, south of the Voi River, so plan a short onward ride.")}</Step>
              <Step name={tr("Wundanyi, the hill town")} filled last>{tr("Take a matatu or a taxi up from Voi. From Mombasa it is about 150 km.")}</Step>
            </ol>
          </aside>
        </div>
      </section>

      <section aria-label={tr("At a glance")} className="relative z-10 mx-auto -mt-12 max-w-6xl px-6">
        <dl className={`${CARD} grid grid-cols-2 lg:grid-cols-4`}>
          {facts.map(([label, value], i) => (
            <div key={label} className={`p-5 ${i % 2 === 0 ? "border-r border-stone/15" : ""} ${i < 2 ? "border-b border-stone/15 lg:border-b-0" : ""} ${i === 1 ? "lg:border-r" : ""}`}>
              <dt className="font-body text-[0.8rem] text-stone/80">{label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-stone sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10"><EssentialsNav sections={SECTIONS.map((s) => ({ id: s.id, label: tr(s.title) }))} /></div>

      <div className="mx-auto max-w-6xl px-6">
        <section id="getting-here" aria-labelledby="getting-here-title" className="scroll-mt-40 pt-16">
          <h2 id="getting-here-title" className={H2}>{tr(titleOf("getting-here"))}</h2>
          <p className="mt-3 max-w-2xl font-body text-lg leading-relaxed text-stone/90">{tr("Wundanyi, the hill town, is about 400 km from Nairobi and 150 km from Mombasa.")}</p>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {([["car", tr("By car"), tr("about seven hours"), tr("Driving from Nairobi usually takes around seven hours.")], ["bus", tr("By coach and matatu"), tr("via Voi"), tr(getting[1])], ["train", tr("By SGR train"), tr("to Voi"), tr(getting[2])]] as [IconName, string, string, string][]).map(([icon, title, tag, text]) => (
              <li key={title} className={`${CARD} flex flex-col gap-3 p-6`}>
                <div className="flex items-center justify-between"><EssentialsIcon name={icon} size={32} className="text-rust-deep" /><span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-rust-deep">{tag}</span></div>
                <h3 className="font-display text-2xl font-semibold text-stone">{title}</h3>
                <p className="font-body text-base leading-relaxed text-stone/90">{text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className={`${CARD} p-6`}>
              <h3 className="font-body text-base font-bold text-stone">{tr("Matatus from Voi go to")}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">{["Wundanyi", "Taveta", "Kasigau", "Mbololo", "Mombasa"].map((p) => <li key={p} className="rounded-full border border-stone/30 bg-parchment px-4 py-2 font-body text-[0.95rem] font-semibold text-stone">{p}</li>)}</ul>
            </div>
            <div className="flex gap-4 rounded-[4px] bg-stone p-6 text-parchment">
              <EssentialsIcon name="alert" size={24} className="mt-0.5 shrink-0 text-ochre-light" />
              <p className="font-body text-base leading-relaxed">{tr("Timetables and fares change, and not every express train stops at Voi.")} <Ext href={KRC_URL} className="focus-ring font-bold text-ochre-light underline underline-offset-2">{tr("Check Kenya Railways before you travel")}</Ext></p>
            </div>
          </div>
        </section>

        <section id="when-to-go" aria-labelledby="when-to-go-title" className="scroll-mt-40 pt-20">
          <h2 id="when-to-go-title" className={H2}>{tr(titleOf("when-to-go"))}</h2>
          <p className="mt-3 max-w-2xl font-body text-lg leading-relaxed text-stone/90">{tr("The dry months are the most comfortable and the best for seeing wildlife in Tsavo. The short rains bring fewer visitors and sometimes lower rates.")}</p>
          <div className="mt-9"><MonthStrip months={months} seasons={seasons} /></div>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {([["bg-ochre", seasons.dry], ["bg-canopy-deep", seasons.long], ["", seasons.short]] as [string, { title: string; body: string }][]).map(([bg, s], i) => (
              <li key={s.title} className="flex gap-3">
                <span aria-hidden="true" style={i === 2 ? { backgroundImage: "repeating-linear-gradient(135deg,#8FB09B 0 4px,#A8C4B3 4px 8px)" } : undefined} className={`mt-1 h-5 w-5 shrink-0 rounded-[3px] ${bg}`} />
                <div><h3 className="font-body text-base font-bold text-stone">{s.title}</h3><p className="mt-0.5 font-body text-[0.95rem] leading-relaxed text-stone/90">{s.body}</p></div>
              </li>
            ))}
          </ul>
          <p className="mt-8 flex gap-3 rounded-[4px] bg-canopy-deep p-5 font-body text-base leading-relaxed text-parchment"><EssentialsIcon name="warm" size={24} className="mt-0.5 shrink-0 text-ochre-light" />{tr(when[3])}</p>
        </section>

        <div className="grid gap-x-16 lg:grid-cols-2">
          <section id="money" aria-labelledby="money-title" className="scroll-mt-40 pt-20">
            <h2 id="money-title" className={H2}>{tr(titleOf("money"))}</h2>
            <ul className="mt-4 border-t border-stone/15">
              <Row icon="cash" title={tr("Kenya shilling and M-Pesa")}>{tr(money[0])}</Row>
              <Row icon="phone" title={tr("Cash")}>{tr(money[1])}</Row>
              <Row icon="tag" title={tr("Prices on this site")}>{tr(money[2])}</Row>
              <Row icon="ticket" title={tr("Park entry fees")}>
                <p>{tr(money[3])}</p>
                <Ext href={KWS_URL} className={`${BTN} mt-4 min-h-[44px] border border-stone px-5 text-stone hover:bg-stone hover:text-parchment`}>{tr("Check current fees with the Kenya Wildlife Service")}</Ext>
              </Row>
            </ul>
          </section>
          <section id="staying-safe" aria-labelledby="staying-safe-title" className="scroll-mt-40 pt-20">
            <h2 id="staying-safe-title" className={H2}>{tr(titleOf("staying-safe"))}</h2>
            <ul className="mt-4 border-t border-stone/15">
              <Row icon="paw" title={tr("Dangerous wildlife")}>{tr(safe[0])}</Row>
              <Row icon="boot" title={tr("Walking in the hills")}>{tr(safe[1])}</Row>
              <Row icon="map" title={tr("Mobile signal")}>{tr(safe[2])}</Row>
              <Row icon="clock" title={tr("Park gates")}>{tr(safe[3])}</Row>
              <Row icon="cross" title={tr("Insurance and health")}>{tr(safe[4])}</Row>
            </ul>
          </section>
        </div>

        <section aria-label={tr("In an emergency")} className="mt-12 grid gap-8 rounded-[4px] bg-stone p-7 text-parchment md:grid-cols-2 md:gap-12 md:p-9">
          <div>
            <p className="font-body text-sm font-semibold uppercase tracking-[0.12em] text-ochre-light">{tr("In an emergency")}</p>
            <p className="mt-3 font-display text-5xl font-semibold leading-none">{tr("999 or 112")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`tel:${EMERGENCY[0]}`} className={`${BTN} bg-rust px-6 text-white hover:bg-rust-deep`}><EssentialsIcon name="call" size={20} />{tr("Call {number}", { number: EMERGENCY[0] })}</a>
              <a href={`tel:${EMERGENCY[1]}`} className={`${BTN} border border-parchment px-6 text-parchment hover:bg-parchment hover:text-stone`}><EssentialsIcon name="call" size={20} />{tr("Call {number}", { number: EMERGENCY[1] })}</a>
            </div>
            <p className="mt-5 max-w-md font-body text-sm leading-relaxed text-parchment/85">{tr(safe[5])}</p>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-parchment/20 pt-6 md:border-l md:border-t-0 md:pl-12 md:pt-0">
            <p className="font-body text-base text-parchment/90">{tr("Kenya Wildlife Service toll-free")}<br /><strong className="font-body text-2xl font-bold text-parchment">0800 597 000</strong></p>
            <a href={KWS_TEL} aria-label={tr("Call the Kenya Wildlife Service")} className="focus-ring inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ochre-light text-ochre-light hover:bg-ochre-light hover:text-stone"><EssentialsIcon name="call" size={22} /></a>
          </div>
        </section>

        <section className="mt-12 flex flex-col gap-6 rounded-[4px] bg-canopy-deep p-8 text-parchment md:flex-row md:items-center md:justify-between md:p-10">
          <div><h2 className="font-display text-3xl font-medium">{tr("Ready to plan your visit?")}</h2><p className="mt-2 max-w-md font-body text-base leading-relaxed text-parchment/90">{tr("Build a day around what you want to see, then find somewhere to stay nearby.")}</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href={lp("/plan")} className={`${BTN} bg-rust text-white hover:bg-rust-deep`}>{tr("Plan your day")}</Link>
            <Link href={lp("/stay")} className={`${BTN} border border-parchment text-parchment hover:bg-parchment hover:text-stone`}>{tr("Find a place to stay")}</Link>
          </div>
        </section>

        <ShareBar className="mt-10" />
        <StoryCredits credits={SOURCES} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-stone/20 bg-parchment/95 px-4 py-3 backdrop-blur md:hidden print:hidden">
        <Link href={lp("/plan")} className={`${BTN} flex-1 bg-rust px-4 text-white hover:bg-rust-deep`}>{tr("Plan your day")}</Link>
        <Link href={lp("/stay")} className={`${BTN} flex-1 border border-stone px-4 text-stone`}>{tr("Stay")}</Link>
      </div>
    </div>
  );
}
