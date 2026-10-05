// Pure rules for impact measurement (no Node-only imports, so safe anywhere).

/** At most this many views of one item are counted per visitor address per day, so refreshing can't inflate a number. */
export const VIEWS_PER_ITEM_PER_DAY = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Obvious non-human traffic: crawlers, link-preview fetchers, monitors and scripts. Real browsers send a
 * long user-agent, so a missing or tiny one is treated as a bot too. This is a filter, not a guarantee —
 * which is why views are always described as approximate.
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 8) return true;
  return /bot|crawl|spider|slurp|headless|preview|fetch|monitor|lighthouse|curl|wget|python-requests|httpclient|facebookexternalhit|embedly|whatsapp\/|telegram|discord|slack/i.test(ua);
}

/**
 * The comparison a sponsor report makes: "since the first note was published" against an equal-length
 * stretch immediately before it (at least a day), so the two numbers are comparable.
 */
export function comparisonWindow(since: Date, now: Date) {
  const length = Math.max(now.getTime() - since.getTime(), DAY_MS);
  return {
    before: { start: new Date(since.getTime() - length), end: since },
    after: { start: since, end: now },
    days: Math.max(1, Math.round(length / DAY_MS)),
  };
}

export function formatCount(n: number) {
  return n.toLocaleString("en-GB");
}

/** One honest sentence about the before/after visitor numbers — context, never a causal claim. */
export function describeVisitors(before: number, after: number, days: number) {
  return `${formatCount(after)} new verified visitor${after === 1 ? "" : "s"} since the first note was published, compared with ${formatCount(before)} in the ${days} day${days === 1 ? "" : "s"} before.`;
}

/** The wording shown with every report, so nobody reads more into the numbers than they support. */
export const METHODOLOGY = [
  "Views are counted from visitors' browsers, once per browser session per page, excluding staff and obvious bots. They are an approximation, not an audited figure.",
  "\"New verified visitors\" counts people whose first-ever QR or GPS check-in at the place fell in each period. It is context, not proof — other things also change visitor numbers, and we cannot show that a note caused a visit.",
  "Enquiries are counted only when a visitor reached a stay or experience through a link on the mission or one of its Field Notes and then sent an enquiry there. \"Confirmed\" means the host or our team marked it confirmed. We cannot see whether a stay or experience was ultimately booked or paid for, and we don't claim a note caused it.",
  "Reports show totals only. They never include visitors' or creators' private details.",
];
