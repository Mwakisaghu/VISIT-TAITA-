import { readCredits } from "@/lib/story-credits";
import { tr } from "@/lib/i18n/server";

/** "Sources and credits" at the end of a story: who the facts and words came from, with links that open in a new tab. Nothing at all if there are none. */
export default function StoryCredits({ credits }: { credits: string | null | undefined }) {
  const items = readCredits(credits); if (items.length === 0) return null;
  return (
    <section aria-labelledby="credits-title" className="mt-12 border-t border-stone/15 pt-8">
      <h2 id="credits-title" className="font-body text-[0.7rem] font-bold uppercase tracking-[0.22em] text-rust-deep">{tr("Sources and credits")}</h2>
      <p className="mt-3 max-w-prose font-body text-sm text-stone/80">{tr("Written for Visit Taita in our own words from the sources below. Please read them for the full story.")}</p>
      <ul className="mt-3 flex max-w-prose flex-col gap-1 font-body text-sm text-stone/90">
        {items.map((c, i) => (
          <li key={i}>
            {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="focus-ring inline-block py-1.5 font-semibold underline underline-offset-4 hover:text-rust-deep">{c.title}<span className="sr-only">{" "}{tr("(opens in a new tab)")}</span></a> : <span className="inline-block py-1.5 font-semibold">{c.title}</span>}
            {c.by && <span className="text-stone/75"> · {c.by}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
