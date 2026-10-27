import Watermark from "@/components/brand/Watermark";
import { detailLines, detailParagraphs, hasMoreDetails, parseProgramme, type EventDetails } from "@/lib/event-details";

const h3 = "font-body text-[0.68rem] font-bold uppercase tracking-[0.22em] text-rust-deep";
const prose = "mt-3 whitespace-pre-line break-words font-body text-[0.98rem] leading-relaxed text-stone/85";

/**
 * "Show more details" on an event: a closed-by-default expandable section with the longer description, the programme, what is included, what to bring, how to get there, age and access, and a contact.
 * It uses the browser's own expandable element, so it works without JavaScript, opens with Enter or Space, and is announced as expanded or collapsed. Nothing renders unless at least one part is filled in.
 */
export default function EventMoreDetails({ event }: { event: EventDetails }) {
  if (!hasMoreDetails(event)) return null;
  const about = detailParagraphs(event.details), programme = parseProgramme(event.programme), included = detailLines(event.included), bring = detailLines(event.bring);
  const there = detailParagraphs(event.gettingThere), access = detailParagraphs(event.accessibility), contact = detailLines(event.contact);
  const list = (items: string[]) => <ul className="mt-3 space-y-2">{items.map((x, i) => <li key={i} className="flex gap-3 font-body text-[0.98rem] leading-relaxed text-stone/85"><span aria-hidden="true" className="mt-[0.65em] h-1.5 w-1.5 flex-none rounded-full bg-rust" /><span className="break-words">{x}</span></li>)}</ul>;
  const text = (ps: string[]) => ps.map((p, i) => <p key={i} className={prose}>{p}</p>);
  return (
    <section aria-labelledby="more-details-title" className="mt-10">
      <h2 id="more-details-title" className="sr-only">More details about this event</h2>
      <details className="group relative overflow-hidden rounded-sm border border-stone/25 bg-parchment-dim/50">
        <summary className="focus-ring flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-body text-[0.78rem] font-bold uppercase tracking-[0.2em] text-stone marker:content-none [&::-webkit-details-marker]:hidden">
          <span><span className="group-open:hidden">Show more details</span><span className="hidden group-open:inline">Show fewer details</span></span>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-5 w-5 flex-none transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="relative border-t border-stone/20 px-6 pb-12 pt-8">
          <Watermark className="-bottom-8 -right-8 h-44 w-72 text-stone opacity-[0.06]" />
          <div className="relative grid gap-x-12 gap-y-10 md:grid-cols-2">
            {about.length > 0 && <div className="md:col-span-2"><h3 className={h3}>About this event</h3>{text(about)}</div>}
            {programme.length > 0 && (
              <div className="md:col-span-2">
                <h3 className={h3}>Programme</h3>
                <ol className="mt-3 border-t border-stone/20">
                  {programme.map((p, i) => <li key={i} className="grid grid-cols-[4.75rem_1fr] gap-4 border-b border-stone/15 py-3 font-body text-[0.98rem] leading-relaxed text-stone/85"><span className="font-display text-lg leading-snug text-rust-deep">{p.time ?? ""}</span><span className="break-words">{p.text}</span></li>)}
                </ol>
              </div>
            )}
            {included.length > 0 && <div><h3 className={h3}>What&apos;s included</h3>{list(included)}</div>}
            {bring.length > 0 && <div><h3 className={h3}>What to bring</h3>{list(bring)}</div>}
            {there.length > 0 && <div><h3 className={h3}>Getting there</h3>{text(there)}</div>}
            {access.length > 0 && <div><h3 className={h3}>Age and accessibility</h3>{text(access)}</div>}
            {contact.length > 0 && <div><h3 className={h3}>Contact the organiser</h3>{text(contact)}</div>}
          </div>
        </div>
      </details>
    </section>
  );
}
