import type { Metadata } from "next";
import Link from "next/link";
import StoryCredits from "@/components/stories/StoryCredits";
import ShareBar from "@/components/share/ShareBar";
import { hreflangLinks, localizePath } from "@/lib/i18n/config";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { LAST_CHECKED, SECTIONS, SOURCES } from "@/app/essentials/content";
import { shareMeta } from "@/lib/share-meta";
import { getSiteUrl } from "@/lib/site-url";


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
