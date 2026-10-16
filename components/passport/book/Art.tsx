// The Passport's drawn art: stamps, endorsement seals, the "Issued" stamp, the cover emblem. Pure SVG, no state, no emoji:
// emoji are drawn by each phone's own font, so no two visitors would see the same badge, and none would match the site.
import type { Locale } from "@/lib/i18n/config";
import { bandDate, metres, stampLabel, zoneOf, type Endorsement, type PassportPlace, type ZoneKey } from "@/lib/passport-book";
import type { Tr } from "@/components/passport/book/types";

const GLYPH: Record<ZoneKey, React.ReactNode> = {
  plains: <path d="M38 58H82M60 58V46M60 51L53 46M60 49L67 45M45 45Q60 33 75 45" />,
  foothills: (<><path d="M36 58Q48 42 58 53Q67 40 84 58" /><circle cx="74" cy="40" r="4.5" /></>),
  highlands: (<><path d="M36 58L52 38L60 49L68 41L84 58" /><path d="M44 31Q50 27 56 31M64 29Q70 25 76 29" /></>),
  elsewhere: (<><path d="M60 62C60 62 47 53 47 43C47 36 52 31 60 31C68 31 73 36 73 43C73 53 60 62 60 62Z" /><circle cx="60" cy="43" r="4.5" /></>),
};
const F = { fontFamily: "var(--font-manrope), Manrope, system-ui, sans-serif" } as const;

/** A place's stamp. Not visited: a faint dashed outline with the zone's drawing. Marked as visited: a lighter, dashed stamp with no date. Stamped: full ink, with its date. */
export function StampArt({ place, locale, tr, uid }: { place: PassportPlace; locale: Locale; tr: Tr; uid: string }) {
  const zone = zoneOf(place.altitudeM);
  if (place.state === "open") {
    return (<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity=".4"><circle cx="60" cy="60" r="55" strokeWidth="2" strokeDasharray="3 6" /><g strokeWidth="2.2" transform="translate(0 6)">{GLYPH[zone]}</g></g></svg>);
  }
  const id = `st-${uid}-${place.id}`; const marked = place.state === "marked";
  const band = marked ? tr("MARKED") : place.visitedAt ? bandDate(place.visitedAt, locale) : "";
  const label = stampLabel(place.name);
  const bottom = place.altitudeM !== null ? metres(place.altitudeM, locale).toUpperCase() : place.region.toUpperCase().slice(0, 16);
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><path id={`${id}-t`} d="M20 60A40 40 0 0 1 100 60" /><path id={`${id}-b`} d="M13 60A47 47 0 0 0 107 60" /></defs>
      <g opacity={marked ? 0.62 : undefined} filter={marked ? undefined : "url(#pp-rough)"} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="60" r="56" strokeWidth="2.6" strokeDasharray={marked ? "6 4" : undefined} />
        <circle cx="60" cy="60" r="51" strokeWidth=".9" />
        <g strokeWidth="2.2">{GLYPH[zone]}</g>
        <rect x="22" y="62" width="76" height="15" rx="2" fill="currentColor" stroke="none" />
        <text x="60" y="73" textAnchor="middle" {...F} fontSize={band.length > 9 ? 7.4 : 8.8} fontWeight="800" letterSpacing=".7" fill="var(--pp-paper)" stroke="none">{band}</text>
        <text {...F} fontSize={label.length > 10 ? 9 : 10.5} fontWeight="800" letterSpacing={label.length > 10 ? 1.2 : 1.8} fill="currentColor" stroke="none"><textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">{label}</textPath></text>
        <text {...F} fontSize="8.6" fontWeight="800" letterSpacing="1.4" fill="currentColor" stroke="none"><textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">{bottom}</textPath></text>
      </g>
    </svg>
  );
}

/** The stamp every passport starts with: you did join, so it is real progress, dated the day you did. */
export function IssuedArt({ issuedAt, locale, tr }: { issuedAt: string; locale: Locale; tr: Tr }) {
  return (
    <svg className="pp-issued" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><path id="is-t" d="M20 60A40 40 0 0 1 100 60" /><path id="is-b" d="M13 60A47 47 0 0 0 107 60" /></defs>
      <g filter="url(#pp-rough)" fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="60" cy="60" r="56" strokeWidth="2.6" /><circle cx="60" cy="60" r="51" strokeWidth=".9" />
        <path d="M40 52Q60 28 80 52M60 28V22M44 40L40 35M76 40L80 35" strokeWidth="2.2" />
        <rect x="20" y="58" width="80" height="17" rx="2" fill="currentColor" stroke="none" />
        <text x="60" y="70.5" textAnchor="middle" {...F} fontSize="9.6" fontWeight="800" letterSpacing=".9" fill="var(--pp-paper)" stroke="none">{bandDate(issuedAt, locale)}</text>
        <text {...F} fontSize="10.5" fontWeight="800" letterSpacing="1.8" fill="currentColor" stroke="none"><textPath href="#is-t" startOffset="50%" textAnchor="middle">KARIBU</textPath></text>
        <text {...F} fontSize="8.6" fontWeight="800" letterSpacing="1.4" fill="currentColor" stroke="none"><textPath href="#is-b" startOffset="50%" textAnchor="middle">{tr("ISSUED IN TAITA")}</textPath></text>
      </g>
    </svg>
  );
}

const SEAL_GLYPH: Record<string, React.ReactNode> = {
  explorer: (<><circle cx="48" cy="48" r="17" /><path d="M48 29V33M48 63V67M29 48H33M63 48H67" /><path d="M54 42L50 50L42 54L46 46Z" /></>),
  wild: (<><path d="M30 64H66M48 64V51M48 55L40 48M48 53L56 47M34 46Q48 32 62 46" /><circle cx="62" cy="34" r="3.5" /></>),
  culture: <path d="M42 31H54M44 31C44 38 36 40 36 50C36 60 42 66 48 66C54 66 60 60 60 50C60 40 52 38 52 31M39 47H57" />,
  trails: (<><path d="M29 66L48 35L67 66Z" /><path d="M40 66Q48 58 46 52Q44 46 48 42" /></>),
  taste: (<><path d="M31 50H65C65 60 58 66 48 66C38 66 31 60 31 50Z" /><path d="M40 44C40 40 44 40 44 36M50 44C50 40 54 40 54 36M42 69H54" /></>),
  sport: (<><circle cx="48" cy="48" r="17" /><path d="M48 41L55 46L52 54H44L41 46Z M48 41V31M55 46L64 43M52 54L58 62M44 54L38 62M41 46L32 43" /></>),
  insider: (<><circle cx="39" cy="48" r="8" /><path d="M47 48H68M62 48V55M67 48V54" /></>),
  legend: <path d="M31 58L33 40L41 50L48 35L55 50L63 40L65 58Z M31 65H65" />,
  star: <path d="M48 31l5.1 10.5 11.5 1.6-8.3 8.1 2 11.5L48 57.3 37.7 62.7l2-11.5-8.3-8.1 11.5-1.6z" />, // any endorsement the team adds that has no drawing of its own
};
/** The drawing for an endorsement: from its key (TAITA_WILD gives "wild"), or a star when it has none. */
export const sealGlyphKey = (key: string): string => { const k = key.replace(/^TAITA_/, "").toLowerCase(); return k in SEAL_GLYPH ? k : "star"; };

/** An endorsement seal. Earned: filled green with a gold perforated rim. Not yet earned: hollow, with a ring that fills as far as the person has got (only when that can be counted). */
export function SealArt({ e }: { e: Endorsement }) {
  const C = 2 * Math.PI * 41; const prog = e.progress ? Math.max(0, Math.min(1, e.progress.have / e.progress.need)) : 0;
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="48" cy="48" r="45" stroke={e.earned ? "var(--pp-ochre)" : "var(--pp-paper-muted)"} strokeWidth="2.4" strokeDasharray="1.5 4.2" opacity={e.earned ? undefined : 0.55} />
      <circle cx="48" cy="48" r="40" fill={e.earned ? "var(--pp-canopy)" : "rgba(27,24,21,.05)"} stroke={e.earned ? "var(--pp-canopy-deep)" : "rgba(27,24,21,.16)"} strokeWidth="1.5" />
      {!e.earned && prog > 0 && <circle cx="48" cy="48" r="41" stroke="var(--pp-ochre)" strokeWidth="3.4" strokeDasharray={`${(C * prog).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 48 48)" />}
      <g stroke={e.earned ? "var(--pp-ochre-light)" : "rgba(27,24,21,.42)"} strokeWidth="2.6">{SEAL_GLYPH[sealGlyphKey(e.key)]}</g>
    </svg>
  );
}

export function Ridge() {
  return (<div className="pp-ridge" aria-hidden="true"><svg viewBox="0 0 400 34" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".4"><path d="M0 26L30 20L55 24L85 12L110 22L140 16L170 25L205 8L235 21L265 14L300 24L335 11L365 20L400 15" /><path d="M0 31L40 27L80 30L130 24L190 30L250 25L320 30L400 26" opacity=".6" /></svg></div>);
}
export function CoverEmblem() {
  return (<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M10 88H110" /><path d="M60 88V54M60 66L44 52M60 62L76 48M60 54L50 44" /><path d="M26 44Q60 16 94 44" /><path d="M34 40Q60 22 86 40" opacity=".6" /><circle cx="92" cy="22" r="6" /></svg>);
}
export function FlagIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M6 21V4M6 5h11l-2 4 2 4H6" /></svg>);
}
/** The rough-ink filter every stamp uses, defined once. It is drawn once, never animated. */
export function InkFilter() {
  return (<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false"><defs><filter id="pp-rough" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.9" /></filter></defs></svg>);
}
