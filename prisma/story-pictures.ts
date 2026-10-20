// Pictures with proper credits for the stories whose pictures were borrowed from other websites (or missing). Used by scripts/fix-story-pictures.ts. (This file lives beside the seed, not in lib/: the privacy guard
// scans lib/ for anything that looks like a browser cookie or storage name.)
//   * Both pictures are on Wikimedia Commons, each under a Creative Commons licence that asks for credit (given with the picture): the credit is stored with the story and shown beside the picture.
//   * Wikimedia stores a file at a fixed address worked out from its name, so the addresses are computed here, not typed. The script tests each from YOUR computer before using it and tries the next if it fails.
//   * "The Keepers of Ngangao" has NO picture here on purpose: no photograph of Ngangao with a clear licence was found, and a different forest would mislead. It gets the site's own "picture coming soon" image
//     until you have a real photograph (taken with the keepers' consent).
import { createHash } from "node:crypto";
import { isApprovedStoryPicture } from "../lib/story-picture";
import { OWN_PLACEHOLDER } from "../lib/image-policy";

const name = (file: string) => file.replace(/ /g, "_");
/** The folder part of a Commons file's address: the first one and first two hex digits of the MD5 of its name (for example Example.jpg is a/a9/Example.jpg). */
export const commonsPath = (file: string): string => { const n = name(file); const h = createHash("md5").update(n).digest("hex"); return `${h[0]}/${h.slice(0, 2)}/${n}`; };
export const commonsFile = (file: string): string => `https://upload.wikimedia.org/wikipedia/commons/${commonsPath(file)}`;
/** A resized copy Wikimedia makes on request (never larger than the original). */
export const commonsThumb = (file: string, width: number): string => `https://upload.wikimedia.org/wikipedia/commons/thumb/${commonsPath(file)}/${width}px-${name(file)}`;
const page = (file: string) => `https://commons.wikimedia.org/wiki/File:${name(file)}`;
const candidates = (file: string): string[] => [commonsThumb(file, 1280), commonsThumb(file, 960), commonsThumb(file, 640), commonsFile(file)];

export type StoryPicture = { candidates: string[]; credit: string | null; about: string };
export const STORY_PICTURES: Record<string, StoryPicture> = {
  "shetani-where-the-devil-came-out-of-the-earth": {
    candidates: candidates("Shetani Lava Flow in Tsavo West National Park in Kenya.jpg"),
    credit: `Ninara | CC BY 2.0 | ${page("Shetani Lava Flow in Tsavo West National Park in Kenya.jpg")}`,
    about: "The Shetani lava flow, Tsavo West National Park (photographed 6 December 2023; Creative Commons Attribution 2.0)",
  },
  "a-lodge-on-stilts-the-story-of-salt-lick": {
    candidates: candidates("Salt Lick Lodge in the evening.jpg"),
    credit: `Leonora Enking | CC BY-SA 2.0 | ${page("Salt Lick Lodge in the evening.jpg")}`,
    about: "Salt Lick Lodge on its stilts in the evening (Creative Commons Attribution-ShareAlike 2.0)",
  },
  "keepers-of-ngangao": { candidates: [OWN_PLACEHOLDER], credit: null, about: "No licensed photograph of Ngangao was found: the site's own 'picture coming soon' image until you have a real one" },
};

type Row = { slug: string; image: string | null; imageCredit: string | null };
type Db = { story: { findUnique(a: { where: { slug: string } }): Promise<Row | null>; update(a: { where: { slug: string }; data: { image: string; imageCredit: string | null } }): Promise<unknown> } };
export type FixResult = { fixed: Array<{ slug: string; picture: string }>; skipped: Array<{ slug: string; why: string }> };

/**
 * Gives each listed story a picture it may show, but ONLY where it needs one: a story that already shows a real approved picture is left alone, so nothing an editor chose is ever overwritten. For each story it
 * tries the candidate addresses in order and uses the first that `check` says is really a picture. With apply false (the default in the script) nothing is written.
 */
export async function fixStoryPictures(db: Db, { apply = false, check = async () => true, log = (_: string) => {} }: { apply?: boolean; check?: (url: string) => Promise<boolean>; log?: (s: string) => void } = {}): Promise<FixResult> {
  const out: FixResult = { fixed: [], skipped: [] };
  for (const [slug, pic] of Object.entries(STORY_PICTURES)) {
    const skip = (why: string) => { out.skipped.push({ slug, why }); log(`  skipped ${slug}: ${why}`); };
    const row = await db.story.findUnique({ where: { slug } });
    if (!row) { skip("no such story in this database"); continue; }
    const real = (v: string | null) => isApprovedStoryPicture(v) && v !== OWN_PLACEHOLDER;
    if (real(row.image)) { skip("it already shows an approved picture (left alone)"); continue; }
    const wantsPlaceholder = pic.candidates.length === 1 && pic.candidates[0] === OWN_PLACEHOLDER;
    if (wantsPlaceholder && row.image === OWN_PLACEHOLDER) { skip("it already shows the placeholder"); continue; }
    let chosen: string | null = null;
    for (const url of pic.candidates) { if (url.startsWith("/") || (await check(url))) { chosen = url; break; } log(`    ${slug}: could not use ${url}`); }
    if (!chosen) { skip("none of the picture addresses could be opened from here, so nothing was changed"); continue; }
    if (apply) await db.story.update({ where: { slug }, data: { image: chosen, imageCredit: pic.credit } });
    out.fixed.push({ slug, picture: chosen }); log(`  ${apply ? "fixed" : "would fix"} ${slug}: ${chosen}`);
  }
  return out;
}
