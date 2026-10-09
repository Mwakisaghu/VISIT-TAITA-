import { eatDateLabel, whatsappHref } from "@/lib/events-view";

const link = "focus-ring inline-flex min-h-[44px] items-center font-body text-[0.8rem] font-semibold text-stone underline underline-offset-4 hover:text-rust-deep";

/** Share an event on WhatsApp, or put it in a calendar. The WhatsApp link only appears when the site has a public web address to share. */
export default function ShareLinks({ slug, name, date, location, siteUrl }: { slug: string; name: string; date: Date; location: string; siteUrl?: string }) {
  const wa = whatsappHref(`${name} · ${eatDateLabel(date)} · ${location}`, siteUrl, `/events/${slug}`);
  return (
    <div className="flex flex-wrap items-center gap-x-5">
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={link}>Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a>}
      <a href={`/events/${slug}/calendar`} className={link} download>Add to calendar</a>
    </div>
  );
}
