// The admin menu, as data. Pure functions only (no database, no React), so the grouping, the permissions and the "which page am I on"
// logic can be tested on their own — including a test that fails if someone adds an admin page and forgets to put it in the menu.

export type BadgeKey = "partners" | "products" | "stayEnquiries" | "experienceEnquiries" | "reviews" | "creators" | "fieldNotes" | "emails" | "sponsorLeads" | "refunds";
export type NavItem = {
  href: string;
  label: string;
  /** A count of things waiting for a person, shown as a small badge. */
  badge?: BadgeKey;
  /** Only admins and super admins see this (money, accounts). */
  managers?: boolean;
  /** Extra words the "find a page" box matches, so "accounts" finds Users. */
  keywords?: string[];
};
export type NavGroup = { id: string; label: string; items: NavItem[] };

export const OVERVIEW: NavItem = { href: "/admin", label: "Overview", keywords: ["home", "dashboard"] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "places", label: "Places & content",
    items: [
      { href: "/admin/destinations", label: "Destinations", keywords: ["places", "map", "qr"] },
      { href: "/admin/stories", label: "Stories", keywords: ["articles", "blog"] },
      { href: "/admin/events", label: "Events", keywords: ["calendar"] },
    ],
  },
  {
    id: "stays", label: "Stays & experiences",
    items: [
      { href: "/admin/accommodations", label: "Accommodations", keywords: ["stays", "hotels", "lodging"] },
      { href: "/admin/accommodations/enquiries", label: "Stay enquiries", badge: "stayEnquiries", keywords: ["messages", "leads"] },
      { href: "/admin/experiences", label: "Experiences", keywords: ["tours", "activities", "hikes"] },
      { href: "/admin/experiences/enquiries", label: "Experience enquiries", badge: "experienceEnquiries", keywords: ["messages", "leads"] },
      { href: "/admin/bookings", label: "Bookings & refunds", badge: "refunds", managers: true, keywords: ["reservations", "payments", "money"] },
      { href: "/admin/partners", label: "Partner applications", badge: "partners", keywords: ["hosts", "applications", "approve"] },
    ],
  },
  {
    id: "shop", label: "Shop",
    items: [
      { href: "/admin/shop/products", label: "Products", badge: "products", keywords: ["merch", "items", "listings"] },
      { href: "/admin/shop/orders", label: "Orders", keywords: ["purchases", "payments", "fulfilment"] },
    ],
  },
  {
    id: "cup", label: "Football cup",
    items: [
      { href: "/admin/cup/teams", label: "Teams" },
      { href: "/admin/cup/players", label: "Players" },
      { href: "/admin/cup/fixtures", label: "Fixtures", keywords: ["matches", "results", "scores"] },
      { href: "/admin/cup/venues", label: "Pitches & venues", keywords: ["grounds"] },
    ],
  },
  {
    id: "week", label: "Taita Week",
    items: [
      { href: "/admin/week/sessions", label: "Programme", keywords: ["schedule", "sessions", "festival"] },
      { href: "/admin/week/venues", label: "Venues" },
    ],
  },
  {
    id: "community", label: "Community",
    items: [
      { href: "/admin/reviews", label: "Reviews", badge: "reviews", keywords: ["moderation", "ratings", "approve"] },
      { href: "/admin/field-notes", label: "Field notes", badge: "fieldNotes", keywords: ["moderation", "posts", "approve"] },
      { href: "/admin/creators", label: "Creators", badge: "creators", keywords: ["applications", "approve"] },
      { href: "/admin/missions", label: "Missions", keywords: ["challenges", "passport"] },
      { href: "/admin/rewards", label: "Rewards", keywords: ["points", "perks"] },
      { href: "/admin/rewards/redemptions", label: "Vouchers", keywords: ["redemptions", "codes"] },
    ],
  },
  {
    id: "sponsors", label: "Sponsors & impact",
    items: [
      { href: "/admin/sponsors", label: "Sponsors" },
      { href: "/admin/sponsors/packages", label: "Packages", keywords: ["tiers", "pricing"] },
      { href: "/admin/sponsors/leads", label: "Leads", badge: "sponsorLeads", keywords: ["enquiries"] },
      { href: "/admin/impact", label: "Impact reports", keywords: ["report", "sponsor"] },
    ],
  },
  {
    id: "comms", label: "Messages & promotion",
    items: [
      { href: "/admin/newsletter", label: "Newsletter", keywords: ["subscribers", "email list"] },
      { href: "/admin/emails", label: "Email log", badge: "emails", keywords: ["outbox", "failed", "sent"] },
      { href: "/admin/qr", label: "QR codes", keywords: ["links", "short links", "print"] },
    ],
  },
  {
    id: "people", label: "People & access",
    items: [
      { href: "/admin/users", label: "Accounts", managers: true, keywords: ["users", "people", "members", "suspend", "staff", "roles"] },
      { href: "/admin/users/audit", label: "Activity log", managers: true, keywords: ["audit", "history", "who did what"] },
    ],
  },
];

/** The menu this role may see: items they can't use are removed, and so are sections left empty. */
export function visibleGroups(role: string, groups: NavGroup[] = NAV_GROUPS): NavGroup[] {
  const manager = role === "SUPER_ADMIN" || role === "ADMIN";
  return groups.map((g) => ({ ...g, items: g.items.filter((i) => manager || !i.managers) })).filter((g) => g.items.length > 0);
}

const clean = (p: string) => (p.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";

/** Which menu entry the current page belongs to: the most specific one (so /admin/users/audit is "Activity log", not "Accounts"). */
export function activeItem(pathname: string, groups: NavGroup[]): { item: NavItem; group: NavGroup | null } | null {
  const p = clean(pathname);
  let best: { item: NavItem; group: NavGroup | null } | null = p === OVERVIEW.href ? { item: OVERVIEW, group: null } : null;
  for (const group of groups) for (const item of group.items) {
    if (p === item.href || p.startsWith(item.href + "/")) if (!best || item.href.length > best.item.href.length) best = { item, group };
  }
  return best;
}

/** The "find a page" box: matches the name, the section name and the extra keywords. Empty search matches nothing (the menu shows normally). */
export function searchNav(query: string, groups: NavGroup[]): Array<{ item: NavItem; group: NavGroup | null }> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: Array<{ item: NavItem; group: NavGroup | null }> = [];
  const hay = (i: NavItem, g: NavGroup | null) => [i.label, g?.label ?? "", ...(i.keywords ?? [])].join(" ").toLowerCase();
  if (words.every((w) => hay(OVERVIEW, null).includes(w))) out.push({ item: OVERVIEW, group: null });
  for (const group of groups) for (const item of group.items) if (words.every((w) => hay(item, group).includes(w))) out.push({ item, group });
  return out;
}

export type Badges = Partial<Record<BadgeKey, number>>;
/** The total waiting inside a section (shown on its header while it is folded away). */
export const groupBadge = (g: NavGroup, badges: Badges): number => g.items.reduce((n, i) => n + (i.badge ? Math.max(0, badges[i.badge] ?? 0) : 0), 0);
export const badgeText = (n: number) => (n > 99 ? "99+" : String(n));

/** What the overview's "Needs attention" list says for each kind of waiting item. */
export const ATTENTION: Array<{ key: BadgeKey; text: (n: number) => string; href: string; managers?: boolean }> = [
  { key: "refunds", text: (n) => `${n} refund${n === 1 ? "" : "s"} to send`, href: "/admin/bookings/refunds", managers: true },
  { key: "partners", text: (n) => `${n} partner application${n === 1 ? "" : "s"} to review`, href: "/admin/partners" },
  { key: "products", text: (n) => `${n} seller product${n === 1 ? "" : "s"} to approve`, href: "/admin/shop/products" },
  { key: "stayEnquiries", text: (n) => `${n} new stay enquir${n === 1 ? "y" : "ies"}`, href: "/admin/accommodations/enquiries" },
  { key: "experienceEnquiries", text: (n) => `${n} new experience enquir${n === 1 ? "y" : "ies"}`, href: "/admin/experiences/enquiries" },
  { key: "reviews", text: (n) => `${n} review${n === 1 ? "" : "s"} awaiting approval`, href: "/admin/reviews" },
  { key: "fieldNotes", text: (n) => `${n} field note${n === 1 ? "" : "s"} to review`, href: "/admin/field-notes" },
  { key: "creators", text: (n) => `${n} creator application${n === 1 ? "" : "s"} to review`, href: "/admin/creators" },
  { key: "sponsorLeads", text: (n) => `${n} new sponsor lead${n === 1 ? "" : "s"}`, href: "/admin/sponsors/leads" },
  { key: "emails", text: (n) => `${n} email${n === 1 ? "" : "s"} needing attention`, href: "/admin/emails" },
];
