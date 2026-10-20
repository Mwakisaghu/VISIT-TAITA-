// (This file lives beside the seed, not in lib/: the privacy guard scans lib/ for anything that looks like a browser cookie or storage name, and these event slugs begin with "taita-".)
// Realistic "more details" for the three SAMPLE events (the seed's Taita Cup final, Taita Week opening night and The Hills Sessions), so the expandable section shows real-looking content while the site is a preview.
// Written only from what the site already says (the Essentials page's distances, the way to Voi and Wundanyi, and its advice on weather) and general event practice. They invent no organiser, no phone number, no team and no price,
// and the events stay flagged as samples: their pages carry the sample notice until a real organiser replaces them.
import { DETAIL_FIELDS, type EventDetails } from "@/lib/event-details";

export const SAMPLE_EVENT_DETAILS: Record<string, EventDetails> = {
  "taita-cup-final": {
    details: "The final of the Taita Cup, played at Wundanyi Grounds in the hills.\n\nThe gates open early so you can find a place, get something to eat and watch a curtain-raiser before the final. There is food, music and craft around the ground all day, and the cooler air of the hills makes it a comfortable day out.\n\nThe finalists, the match times and the ticket details are confirmed by the organisers closer to the date.",
    programme: "10:00 | Gates open; food and craft stalls open\n12:00 | Curtain-raiser: a youth match\n14:00 | The Taita Cup final, kick-off\n16:30 | Presentation of the cup\n17:30 | The ground closes",
    included: "Entry to Wundanyi Grounds on match day\nThe curtain-raiser as well as the final",
    bring: "Water, a hat and a light rain jacket: the weather in the hills can change quickly\nA warm layer for the late afternoon: the hills are cooler than the plains\nCash or M-Pesa for food and souvenirs\nYour ticket, on your phone or printed, if you booked one",
    gettingThere: "Wundanyi, the hill town, is about 400 km from Nairobi and 150 km from Mombasa. Without a car, take a long-distance coach to Voi, then a matatu or a taxi up to Wundanyi.\n\nOn match day, plan to arrive early and walk the last stretch to the ground: roads near a busy ground fill up. Ask the stewards where to park.",
    accessibility: "Open to all ages; children should come with an adult.\n\nThe ground is an open sports field. If you use a wheelchair or need step-free access, please contact the organiser before the day so that a place can be arranged.",
  },
  "taita-week-opening": {
    details: "The opening night of Taita Week, a week-long festival of sport, food, music and craft, held in Voi Town Square.\n\nVoi is the county's largest town, so the square is an easy first stop on the way into Taita. Come for the food and the music, and pick up the programme for the rest of the week.",
    programme: "17:00 | Stalls open: food, crafts and games\n18:30 | Welcome and the opening of the week\n19:00 | Live music\n21:30 | Close",
    included: "Entry to the opening night\nThe printed programme for the rest of the week",
    bring: "A light jacket: evenings can be cooler than the day\nCash or M-Pesa for food and crafts\nA charged phone, and a safe way to carry it in a crowd",
    gettingThere: "Voi is the county's largest town, on the road between Nairobi and Mombasa, and long-distance coaches stop there. The railway station is outside the town, south of the Voi River, so you will need a short onward ride. Not every express train stops at Voi, so check Kenya Railways before you travel.\n\nThe square is in the town centre.",
    accessibility: "A public town square, open to everyone. Children are welcome with an adult.\n\nAs at any busy event, keep your belongings close and agree a meeting point if you come in a group.",
  },
  "hills-sessions": {
    details: "An evening of live Taita music under the escarpment, in Wundanyi.\n\nThe hills are cooler in the evening, so dress for it. The doors open early with food, and the music runs into the night.",
    programme: "17:30 | Doors open; food and drinks\n19:00 | First set\n20:30 | Main set\n22:00 | Close",
    included: "Entry to the evening\nLive music from local artists",
    bring: "A warm layer: the hills are cooler than the plains, especially in the evening\nA torch or a phone light for the walk back\nCash or M-Pesa for food and drinks",
    gettingThere: "Wundanyi, the hill town, is about 400 km from Nairobi and 150 km from Mombasa. Matatus run between Voi and Wundanyi: if the music runs late, check the last ride back before you go, or stay the night in the hills.",
    accessibility: "An evening event: children should come with an adult.\n\nIf you need step-free access, please contact the organiser before the day.",
  },
};

type Db = { event: { findUnique(a: { where: { slug: string } }): Promise<({ slug: string; isDemo: boolean } & EventDetails) | null>; update(a: { where: { slug: string }; data: EventDetails }): Promise<unknown> } };
export type FillResult = { filled: string[]; skipped: Array<{ slug: string; why: string }> };

/**
 * Puts the sample details on the sample events that exist. It never overwrites anything: an event that is not a sample, one that already has any detail filled in (someone has started on it), and
 * one that does not exist are all left alone and reported. With apply false nothing is written (a rehearsal).
 */
export async function fillSampleDetails(db: Db, { apply = false, log = (_: string) => {} }: { apply?: boolean; log?: (s: string) => void } = {}): Promise<FillResult> {
  const out: FillResult = { filled: [], skipped: [] };
  for (const [slug, data] of Object.entries(SAMPLE_EVENT_DETAILS)) {
    const e = await db.event.findUnique({ where: { slug } });
    const skip = (why: string) => { out.skipped.push({ slug, why }); log(`  skipped ${slug}: ${why}`); };
    if (!e) { skip("no such event in this database"); continue; }
    if (!e.isDemo) { skip("not a sample event (left alone)"); continue; }
    if (DETAIL_FIELDS.some((k) => typeof e[k] === "string" && (e[k] as string).trim() !== "")) { skip("it already has details (left alone)"); continue; }
    if (apply) await db.event.update({ where: { slug }, data });
    out.filled.push(slug); log(`  ${apply ? "filled" : "would fill"} ${slug}`);
  }
  return out;
}
