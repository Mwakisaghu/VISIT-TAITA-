// The big pictures on the homepage, and where they come from. Swap any of them by setting the matching setting (see .env.example): no code change.
// The default hero is the licensed photograph the site already used. Nothing here invents imagery: if a setting is empty, the page uses
// what it has (a drawn landscape behind the hero photo, the hero photo again at the end).

import { normalizePhotoCredit } from "@/lib/photo-credit";

const clean = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  // A path on this site ("/home/hero.jpg") or an https address — nothing else. "//host/x" and "/\host/x" LOOK like paths but browsers treat them as other sites.
  const localPath = s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\");
  return s && (localPath || /^https:\/\/[^\s]+$/i.test(s)) ? s : null;
};

export const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2000";

export type HomeMedia = { heroImage: string; heroVideo: string | null; storyUrl: string | null; heroCredit: string | null };

export function homeMedia(env: Record<string, string | undefined> = process.env): HomeMedia {
  const heroImage = clean(env.HOME_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE;
  const credit = normalizePhotoCredit(env.HOME_HERO_CREDIT); // who took the hero picture; an invalid line is ignored (nothing is shown) rather than shown wrongly
  return { heroImage, heroVideo: clean(env.HOME_HERO_VIDEO), storyUrl: clean(env.HOME_STORY_URL), heroCredit: credit.ok ? credit.value : null };
}
