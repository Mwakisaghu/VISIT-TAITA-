import { T } from "@/lib/i18n/mark";

// The essentials page's words. Kept beside the page, not in it, because a Next.js page file may only export the page itself (the tests read these).
/** The practical things people ask first. Every claim here comes from a source listed at the bottom; where a detail changes (fares, timetables, park fees) the page says to check, and gives no number. */
export const LAST_CHECKED = T("October 2026");
export const SOURCES = [
  "Contact and how to get there (Taita Research Station) | University of Helsinki | https://www.helsinki.fi/en/research-stations/taita-research-station/contact",
  "Voi | Wikipedia | https://en.wikipedia.org/wiki/Voi",
  "The Uganda Railway, part 4: Mazeras to Voi | Roger Farnworth | https://rogerfarnworth.com/2018/05/17/uganda-railways-part-4-mazeras-to-voi/",
  "Tsavo West National Park | Wikivoyage | https://en.wikivoyage.org/wiki/Tsavo_West_National_Park",
  "Best time to visit Tsavo East | African Mecca Safaris | https://www.africanmeccasafaris.com/travel-guide/kenya/parks-reserves/tsavo-east/when-best-time-to-visit",
  "Tsavo East National Park | SafariFind | https://safarifind.com/destinations/tsavo-east-national-park-1762714705507",
].join("\n");

export const SECTIONS = [
  { id: "getting-here", title: T("Getting here"), points: [
    T("Wundanyi, the hill town, is about 400 km from Nairobi and 150 km from Mombasa. Driving from Nairobi usually takes around seven hours."),
    T("Without a car, long-distance coaches run as far as Voi, the county's largest town. From Voi, take a matatu or a taxi up to Wundanyi."),
    T("Voi is also the nearest railway station to the Taita Hills. The Standard Gauge Railway station is outside the town, south of the Voi River, so you will need a short onward ride."),
    T("Matatus run from Voi to Wundanyi, Taveta, Kasigau, Mbololo and Mombasa."),
    T("Timetables and fares change, and not every express train stops at Voi. Check Kenya Railways before you travel."),
  ] },
  { id: "when-to-go", title: T("When to go"), points: [
    T("The dry seasons, roughly June to October and January to February, are the most comfortable and the best for seeing wildlife in Tsavo."),
    T("The long rains, from March to May, are the wettest time of year, and some park roads can be hard to use."),
    T("The short rains, from October or November to December, bring afternoon showers, fewer visitors and sometimes lower rates."),
    T("Higher ground is cooler than the plains, so bring a warm layer for the hills, especially in the evening."),
  ] },
  { id: "money", title: T("Money"), points: [
    T("The currency is the Kenya shilling (KES). Mobile money such as M-Pesa is widely used in Kenya, and many hosts will tell you how they prefer to be paid."),
    T("Carry some cash for matatus, markets and small village purchases, and expect cash machines to be easiest to find in larger towns."),
    T("Prices on this site are \"from\" prices per person or per night. Confirm the final price with the host before you go."),
    T("National park fees are set by the Kenya Wildlife Service, differ by type of visitor and change, so check the current fee and how to pay before you travel."),
  ] },
  { id: "staying-safe", title: T("Staying safe"), points: [
    T("Tsavo is home to elephants, buffaloes, lions, leopards, rhinos and other dangerous wildlife. Follow the rangers' and your guide's instructions, and stay in your vehicle except where getting out is allowed."),
    T("Walk in the hills with a local guide, and tell your host where you are going and when you expect to be back."),
    T("Mobile signal can be patchy in the parks and forests, so download maps before you set out."),
    T("Park gates usually open from 6 am to 6 pm, unless you are staying overnight inside the park. Check before you go."),
    T("Take out travel insurance that covers emergency evacuation, and carry any medicine you need. Ask a doctor or travel clinic about malaria prevention before you travel."),
    T("In an emergency, call 999 or 112. The Kenya Wildlife Service lists a toll-free line, 0800 597 000."),
  ] },
] as const;
