// The content of every page of the Passport. Plain components with no state: the booklet, the plain view and the no-JavaScript fallback all draw from these.
import Link from "next/link";
import { CoverEmblem, FlagIcon, IssuedArt, Ridge, SealArt, StampArt } from "@/components/passport/book/Art";
import type { Tr } from "@/components/passport/book/types";
import { ribbonOf, ribbonX, RIBBON_CUTS } from "@/lib/account-hub-rules";
import { RIBBON_SCALE, ZONE_BOUNDS } from "@/lib/field-guide";
import type { Locale } from "@/lib/i18n/config";
import { CHECKIN_POINTS } from "@/lib/passport-constants";
import { longDate, metres, shortDate, tally, zoneOf, type PassportData, type PassportPlace, type ZoneKey, type ZonePage } from "@/lib/passport-book";

export type Ctx = {
  data: PassportData; tr: Tr; locale: Locale; lp: (href: string) => string;
  interactive: boolean; just: string | null; uid: string; busyWish: string | null;
  openPlace: (id: string) => void; openBook: () => void; removeWish: (id: string) => void;
};
const rotOf = (id: string): string => `${([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 9) - 4}deg`;

export function zoneText(zone: ZoneKey, tr: Tr) {
  switch (zone) {
    case "plains": return { label: tr("Plains"), range: tr("below {m} m", { m: ZONE_BOUNDS.foothillsFrom }), lede: tr("Where Taita begins: the Tsavo plains, savanna and springs.") };
    case "foothills": return { label: tr("Foothills"), range: tr("{from} to {to} m", { from: ZONE_BOUNDS.foothillsFrom.toLocaleString("en"), to: ZONE_BOUNDS.highlandsFrom.toLocaleString("en") }), lede: tr("Where the land starts to climb: markets, kitchens and the first hills.") };
    case "highlands": return { label: tr("Highlands"), range: tr("above {m} m", { m: ZONE_BOUNDS.highlandsFrom.toLocaleString("en") }), lede: tr("The cloud forests of the Taita Hills, the highest part of the journey.") };
    default: return { label: tr("Elsewhere in Taita"), range: tr("Height not recorded"), lede: tr("Places whose height has not been recorded yet.") };
  }
}
const Head = ({ title, num }: { title: string; num: number }) => (<div className="pp-page-head"><b>{title}</b><span>{num}</span></div>);

export function CoverPage({ ctx }: { ctx: Ctx }) {
  const { tr } = ctx;
  const body = (<><CoverEmblem /><span className="pp-t1">Taita<br />Passport</span><span className="pp-t2">Pasipoti ya Taita</span><span className="pp-t3">{tr("Open your passport")}</span><span className="pp-bot">{tr("Taita Taveta · Kenya")}</span></>);
  return ctx.interactive
    ? <button type="button" className="pp-cover" onClick={ctx.openBook} aria-label={tr("Open your Taita Passport")}>{body}</button>
    : <div className="pp-cover" role="img" aria-label="Taita Passport">{body}</div>;
}

export function YouPage({ ctx, num }: { ctx: Ctx; num: number }) {
  const { data, tr, locale } = ctx; const c = tally(data.places);
  const stamped = data.places.filter((p) => p.state === "stamped"); const rb = ribbonOf(stamped.map((p) => ({ id: p.id, name: p.name, altitudeM: p.altitudeM })));
  const next = data.wishes.map((w) => data.places.find((p) => p.id === w.id)).find((p): p is PassportPlace => !!p && p.state === "open");
  const span = RIBBON_SCALE.max - RIBBON_SCALE.min; void span;
  return (
    <div className="pp-page">
      <Head title={tr("You")} num={num} />
      <h2>{data.holder.name}</h2>
      <p className="pp-lede">{tr("Your passport, issued in Taita.")}</p>
      <div className="pp-holder">
        <dl className="pp-data"><dt>{tr("Issued")}</dt><dd>{longDate(data.holder.issuedAt, locale)}</dd>{next && (<><dt>{tr("Next to stamp")}</dt><dd>{next.name}</dd></>)}</dl>
        <IssuedArt issuedAt={data.holder.issuedAt} locale={locale} tr={tr} />
      </div>
      <div className="pp-altline">
        <svg viewBox="0 0 400 44" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
          <path d="M0 22H400" strokeWidth="2" /><path d={`M${RIBBON_CUTS.foothills} 12V32M${RIBBON_CUTS.highlands} 12V32`} opacity=".55" />
          {rb.dots.map((d) => <circle key={d.id} cx={d.x} cy="22" r="4.6" fill="currentColor" className={`pp-z-${d.zone.toLowerCase()}`} />)}
          <text x="0" y="42" fontSize="9.5" fill="currentColor" stroke="none" fontWeight="700">{metres(RIBBON_SCALE.min, locale)}</text>
          <text x="400" y="42" textAnchor="end" fontSize="9.5" fill="currentColor" stroke="none" fontWeight="700">{metres(RIBBON_SCALE.max, locale)}</text>
        </svg>
        <div className="pp-cap">{rb.lowest && rb.highest ? tr("Lowest: {low}. Highest: {high}.", { low: `${rb.lowest.name}, ${metres(rb.lowest.altitudeM, locale)}`, high: `${rb.highest.name}, ${metres(rb.highest.altitudeM, locale)}` }) : tr("Your stamps will appear on this line, from the plains to the highlands.")}</div>
      </div>
      <div className="pp-tally"><div><b>{c.stamped}</b><span>{tr("Stamps")}</span></div><div><b>{c.marked}</b><span>{tr("Self-marked")}</span></div><div><b>{data.points}</b><span>{tr("Points")}</span></div></div>
      <Ridge />
    </div>
  );
}

function Slot({ p, ctx }: { p: PassportPlace; ctx: Ctx }) {
  const { tr, locale } = ctx; const zone = zoneOf(p.altitudeM);
  const where = p.altitudeM !== null ? metres(p.altitudeM, locale) : null;
  const meta = p.state === "stamped" ? [where, p.visitedAt ? shortDate(p.visitedAt, locale) : null].filter(Boolean).join(" · ") : p.state === "marked" ? tr("Marked as visited · no points") : p.canLocate ? tr("Not yet stamped") : tr("Scan the plaque to stamp");
  const label = p.state === "stamped" ? tr("{name}: stamped on {date}. Open for details.", { name: p.name, date: p.visitedAt ? longDate(p.visitedAt, locale) : "" }) : p.state === "marked" ? tr("{name}: marked as visited, no points. Open to stamp it.", { name: p.name }) : tr("{name}: not yet stamped. Open to see how.", { name: p.name });
  const inner = (<><span className={`pp-stamp ${ctx.just === p.id ? "pp-just" : ""}`} style={{ ["--pp-r" as string]: rotOf(p.id) }}><StampArt place={p} locale={locale} tr={tr} uid={ctx.uid} /></span><span className="pp-slot-name">{p.name}</span><span className="pp-slot-meta">{meta}</span></>);
  return (
    <li className="pp-slot" data-state={p.state}>
      {ctx.interactive ? <button type="button" className={`pp-slot-btn pp-z-${zone}`} data-place={p.id} aria-haspopup="dialog" aria-label={label} onClick={() => ctx.openPlace(p.id)}>{inner}</button> : <div className={`pp-slot-btn pp-z-${zone}`}>{inner}</div>}
    </li>
  );
}

export function ZonePageView({ ctx, page, num }: { ctx: Ctx; page: ZonePage; num: number }) {
  const { tr, data } = ctx; const t = zoneText(page.zone, tr);
  const inZone = data.places.filter((p) => zoneOf(p.altitudeM) === page.zone); const done = inZone.filter((p) => p.state === "stamped").length;
  return (
    <div className="pp-page">
      <Head title={t.label} num={num} />
      <h2>{t.label}{page.of > 1 ? <span className="pp-part"> {page.part}/{page.of}</span> : null}</h2>
      <p className="pp-lede">{t.lede}</p>
      <div className={`pp-zone-key pp-z-${page.zone}`}><i aria-hidden="true" /><span>{t.range} · {tr("{done} of {total} stamped", { done, total: inZone.length })}</span></div>
      <ul className="pp-grid">{page.places.map((p) => <Slot key={p.id} p={p} ctx={ctx} />)}</ul>
      <Ridge />
    </div>
  );
}

export function SealsPage({ ctx, num }: { ctx: Ctx; num: number }) {
  const { data, tr, locale } = ctx;
  return (
    <div className="pp-page">
      <Head title={tr("Endorsements")} num={num} />
      <h2>{tr("Endorsements")}</h2>
      <p className="pp-lede">{tr("Seals you earn along the way. The ones still to come show what they take.")}</p>
      {data.endorsements.length === 0 ? <p className="pp-lede">{tr("No endorsements have been set up yet.")}</p> : (
        <ul className="pp-seals">
          {data.endorsements.map((e) => (
            <li key={e.key} className="pp-seal" data-earned={e.earned}>
              <SealArt e={e} />
              <div><b>{e.label}</b><span>{e.earned ? tr("Earned {date}", { date: e.earnedAt ? shortDate(e.earnedAt, locale) : "" }) : e.progress ? `${tr("{have} of {need}", { have: e.progress.have, need: e.progress.need })} · ${e.description}` : e.description}</span></div>
            </li>
          ))}
        </ul>
      )}
      <Ridge />
    </div>
  );
}

export function RewardsPage({ ctx, num }: { ctx: Ctx; num: number }) {
  const { data, tr, locale, lp } = ctx;
  return (
    <div className="pp-page">
      <Head title={tr("Rewards")} num={num} />
      <h2>{tr("Rewards")}</h2>
      <div className="pp-points"><b>{data.points}</b><span>{tr("points")}</span></div>
      <Link className="pp-cta" href={lp("/passport/rewards")}>{tr("Spend your points")}</Link>
      <div id="want-to-go">
        <h3 className="pp-h3">{tr("Want to go")}</h3>
        {data.wishes.length > 0 ? (
          <ul className="pp-wish">
            {data.wishes.map((w) => (
              <li key={w.id}>
                <FlagIcon />
                <div><b>{w.name}</b><span>{[w.region, w.altitudeM !== null ? metres(w.altitudeM, locale) : null].filter(Boolean).join(" · ")}</span>
                  <span className="pp-wish-actions"><Link className="pp-link" href={lp(`/map?place=${w.slug}`)} aria-label={tr("Show {name} on the map", { name: w.name })}>{tr("Show on the map")}</Link>
                    {ctx.interactive && <button type="button" className="pp-link" disabled={ctx.busyWish === w.id} aria-label={tr("Remove {name} from your list", { name: w.name })} onClick={() => ctx.removeWish(w.id)}>{tr("Remove")}</button>}</span></div>
              </li>
            ))}
          </ul>
        ) : <p className="pp-lede">{tr("Nothing saved yet.")} <Link className="pp-link" href={lp("/map")}>{tr("Open the map")}</Link></p>}
      </div>
      <h3 className="pp-h3">{tr("How points work")}</h3>
      <ul className="pp-how"><li><b>{tr("{n} points", { n: CHECKIN_POINTS })}</b> {tr("the first time you stamp a place, by QR code or by location.")}</li><li><b>{tr("No points")}</b> {tr("for a place you only marked as visited. Check in there later to turn the mark into a stamp.")}</li></ul>
      <Ridge />
    </div>
  );
}

export function EndPage({ ctx, num }: { ctx: Ctx; num: number }) {
  const { tr } = ctx;
  return (<div className="pp-page"><Head title={tr("Safe travels")} num={num} /><h2>{tr("Safe travels")}</h2><p className="pp-lede">{tr("Every stamp in this passport is a place you went. There is always another one to find.")}</p><Ridge /></div>);
}
