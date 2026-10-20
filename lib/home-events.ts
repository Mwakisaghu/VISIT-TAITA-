// What the homepage's events block says about itself. Pure, so it can be tested with any clock.
export type HomeEvent = { eventDate: Date; program: string };

const DAY = 86_400_000;
/** "This week in Taita" is only true when the next event really is within a week; otherwise the block says "Coming up". */
export function eventsEyebrow(events: HomeEvent[], now: Date = new Date()): "week" | "soon" {
  if (events.length === 0) return "soon";
  const next = Math.min(...events.map((e) => +e.eventDate));
  return next - +now <= 7 * DAY ? "week" : "soon";
}
/** The next Taita Cup fixture among the upcoming events, if there is one: it gets its own, larger panel. */
export const cupEvent = <E extends HomeEvent>(events: E[]): E | null => events.find((e) => e.program === "TAITA_CUP") ?? null;
/** The other upcoming events (not the one already shown in the Cup panel), soonest first. */
export const otherEvents = <E extends HomeEvent>(events: E[], cup: E | null, max = 3): E[] => events.filter((e) => e !== cup).slice(0, max);
