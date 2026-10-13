import type { Metadata } from "next";
import Link from "next/link";
import StoryCredits from "@/components/stories/StoryCredits";
import ShareBar from "@/components/share/ShareBar";
import { hreflangLinks, localizePath } from "@/lib/i18n/config";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";
import { shareMeta } from "@/lib/share-meta";
import { getSiteUrl } from "@/lib/site-url";

/** The practical things people ask first. Every claim here comes from a source listed at the bottom; where a detail changes (fares, timetables, park fees) the page says to check, and gives no number. */
export const LAST_CHECKED = T("October 2026");
const SOURCES = [
  "Contact and how to get there (Taita Research Station) | University of Helsinki | https://www.helsinki.fi/en/research-stations/taita-research-station/contact",
  "Voi | Wikipedia | https://en.wikipedia.org/wiki/Voi",
  "The Uganda Railway, part 4: Mazeras to Voi | Roger Farnworth | https://rogerfarnworth.com/2018/05/17/uganda-railways-part-4-mazeras-to-voi/",
  "Tsavo West National Park | Wikivoyage | https://en.wikivoyage.org/wiki/Tsavo_West_National_Park",
  "Best time to visit Tsavo East | African Mecca Safaris | https://www.africanmeccasafaris.com/travel-guide/kenya/parks-reserves/tsavo-east/when-best-time-to-visit",
  "Tsavo East National Park | SafariFind | https://safarifind.com/destinations/tsavo-east-national-park-1762714705507",
].join("\n");

export const SECTIONS = [
  { id: "getting-here", title: T("Getting here"), points: [
    T("Wundanyi, the hill town, is about 400 km from Nairobi and 150 km from Mombasa. Driving from Nairobi usually takes around seven hours."),
    T("Without a car, long-distance coaches run as far as Voi, the county's largest town. From Voi, take a matatu or a taxi up to Wundanyi."),
    T("Voi is also the nearest railway station to the Taita Hills. The Standard Gauge Railway station is outside the town, south of the Voi River, so you will need a short onward ride."),
    T("Matatus run from Voi to Wundanyi, Taveta, Kasigau, Mbololo and Mombasa."),
    T("Timetables and fares change, and not every express train stops at Voi. Check Kenya Railways before you travel."),
  ] },
  { id: "when-to-go", title: T("When to go"), points: [
    T("The dry seasons, roughly June to October and January to February, are the most comfortable and the best for seeing wildlife in Tsavo."),
    T("The long rains, from March to May, are the wettest time of year, and some park roads can be hard to use."),
    T("The short rains, from October or November to December, bring afternoon showers, fewer visitors and sometimes lower rates."),
    T("Higher ground is cooler than the plains, so bring a warm layer for the hills, especially in the evening."),
  ] },
  { id: "money", title: T("Money"), points: [
    T("The currency is the Kenya shilling (KES). Mobile money such as M-Pesa is widely used in Kenya, and many hosts will tell you how they prefer to be paid."),
    T("Carry some cash for matatus, markets and small village purchases, and expect cash machines to be easiest to find in larger towns."),
    T("Prices on this site are \"from\" prices per person or per night. Confirm the final price with the host before you go."),
    T("National park fees are set by the Kenya Wildlife Service, differ by type of visitor and change, so check the current fee and how to pay before you travel."),
  ] },
  { id: "staying-safe", title: T("Staying safe"), points: [
    T("Tsavo is home to elephants, buffaloes, lions, leopards, rhinos and other dangerous wildlife. Follow the rangers' and your guide's instructions, and stay in your vehicle except where getting out is allowed."),
    T("Walk in the hills with a local guide, and tell your host where you are going and when you expect to be back."),
    T("Mobile signal can be patchy in the parks and forests, so download maps before you set out."),
    T("Park gates usually open from 6 am to 6 pm, unless you are staying overnight inside the park. Check before you go."),
    T("Take out travel insurance that covers emergency evacuation, and carry any medicine you need. Ask a doctor or travel clinic about malaria prevention before you travel."),
    T("In an emergency, call 999 or 112. The Kenya Wildlife Service lists a toll-free line, 0800 597 000."),
  ] },
] as const;

/** The page's own title and description (in the visitor's language), a share preview, and its language links: it exists in all four languages, so it says so. */
export function generateMetadata(): Metadata {
  const locale = getLocale(); const site = getSiteUrl(); const links = hreflangLinks("/essentials", site, ["sw", "fr", "de"]);
  const title = tr("Visitor essentials"); const description = tr("How to get to Taita Taveta, when to go, how to pay and how to stay safe.");
  const own = site.replace(/\/+$/, "") + localizePath("/essentials", locale);
  return { title, description, ...shareMeta(title, description), alternates: { canonical: own, languages: Object.fromEntries(links.map((l) => [l.hreflang, l.href])) } };
}

export default function EssentialsPage() {
  const btn = "focus-ring inline-flex min-h-[48px] items-center rounded-[2px] px-7 font-body text-[0.75rem] font-bold uppercase tracking-[0.2em]";
  return (
    <div>
      <section className="bg-stone px-6 py-20 text-parchment sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ochre">{tr("Visitor essentials")}</p>
          <h1 className="mt-4 font-display text-3xl font-medium leading-tight sm:text-5xl">{tr("Everything you need")}<br />{tr("before you come.")}</h1>
          <p className="mt-5 max-w-xl font-body text-lg text-parchment/85">{tr("The practical things people ask most: how to get here, when to go, how to pay and how to stay safe.")}</p>
          <nav aria-label={tr("On this page")} className="mt-8 flex flex-wrap gap-3">
            {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-parchment/40 px-5 font-body text-sm font-semibold text-parchment transition-colors hover:bg-parchment hover:text-stone">{tr(s.title)}</a>)}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
              <h2 id={`${s.id}-title`} className="font-display text-3xl text-stone">{tr(s.title)}</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {s.points.map((p) => <li key={p} className="font-body text-base leading-relaxed text-stone/90">{tr(p)}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-14 max-w-prose font-body text-sm text-stone/80">{tr("These details change. Last checked in {when}.", { when: tr(LAST_CHECKED) })}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href={lp("/plan")} className={`${btn} bg-rust text-parchment hover:bg-rust-deep`}>{tr("Plan your day")}</Link>
          <Link href={lp("/stay")} className={`${btn} border border-stone text-stone hover:bg-stone hover:text-parchment`}>{tr("Stay")}</Link>
        </div>
        <ShareBar className="mt-8" />
        <StoryCredits credits={SOURCES} />
      </div>
    </div>
  );
}
