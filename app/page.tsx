import ClosingSection from "@/components/home/ClosingSection";
import EventsSection from "@/components/home/EventsSection";
import ExperiencesSection from "@/components/home/ExperiencesSection";
import FindYourTaita from "@/components/home/FindYourTaita";
import HomeHero from "@/components/home/HomeHero";
import PassportSection from "@/components/home/PassportSection";
import PlanSection from "@/components/home/PlanSection";
import StayLocalSection from "@/components/home/StayLocalSection";
import StoriesSection from "@/components/home/StoriesSection";
import ThisIsTaita from "@/components/home/ThisIsTaita";
import Newsletter from "@/components/Newsletter";
import SponsorStrip from "@/components/sponsors/SponsorStrip";
import { loadHome } from "@/lib/home-data";
import { homeMedia } from "@/lib/home-media";
import type { Metadata } from "next";
import { hreflangLinks, localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site-url";
import EssentialsStrip from "@/components/home/EssentialsStrip";

// Public, non-personalized content — safe to cache and revalidate rather than hitting Postgres on every single request.
export const revalidate = 60;

/**
 * The homepage is a journey, in order: ARRIVE (hero) -> DISCOVER (find your Taita) -> UNDERSTAND (this is Taita) -> EXPLORE (experiences) ->
 * CONNECT (stories) -> PARTICIPATE (passport) -> JOIN (events) -> SUPPORT (stay local) -> RETURN (the closing call).
 * Every database-driven part has a designed empty state, and a failure in one never blanks the page.
 */
/** Which language this page is in, and the other languages it really exists in (so search engines list each one, and send people to the right one). */
export function generateMetadata(): Metadata {
  const locale = getLocale(); const site = getSiteUrl(); const links = hreflangLinks("/", site, ["sw", "fr", "de"]);
  const own = site.replace(/\/+$/, "") + (localizePath("/", locale) === "/" ? "" : localizePath("/", locale));
  return { alternates: { canonical: own || site, languages: Object.fromEntries(links.map((l) => [l.hreflang, l.href])) } };
}

export default async function HomePage() {
  const media = homeMedia();
  const data = await loadHome();
  // The sponsor strip fetches for itself; if it fails, the rest of the page still renders.
  let sponsors: React.ReactNode = null;
  try { sponsors = await SponsorStrip({ program: "HOME" }); } catch (e) { console.error("[home] sponsor strip could not load:", (e as Error).message); }

  return (
    <>
      <HomeHero media={media} />
      <FindYourTaita tiles={data.tiles} />
      <ThisIsTaita people={data.people} land={data.land} stories={data.storiesPic} />
      <ExperiencesSection items={data.experiences} />
      <PlanSection />
      <EssentialsStrip />
      <StoriesSection stories={data.stories} />
      <EventsSection events={data.events} />
      <StayLocalSection local={data.local} />
      <PassportSection />
      {sponsors}
      <ClosingSection image={media.closingImage} />
      <Newsletter />
    </>
  );
}
