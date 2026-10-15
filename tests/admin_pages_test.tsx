import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load; let session: any = null; let pathname = "/admin";
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/navigation") return { redirect: (p: string) => { throw new Error("NEXT_REDIRECT:" + p); }, notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, usePathname: () => pathname, useRouter: () => ({ push() {}, refresh() {} }) };
  if (r === "@/lib/actions/users-admin") return { suspendUser: async () => ({ success: true }), reinstateUser: async () => ({ success: true }) };
  return origLoad.call(this, r, ...x);
};
import { renderToStaticMarkup } from "react-dom/server";

// ----- a tiny stand-in database: users with real filtering, plus configurable counts for everything else -----
const users: any[] = []; const counts: Record<string, number> = {}; const spy: string[] = []; let failing = new Set<string>();
const matchUser = (u: any, where: any = {}): boolean => {
  for (const [k, v] of Object.entries<any>(where)) {
    if (k === "AND") { if (!v.every((c: any) => matchUser(u, c))) return false; continue; }
    if (k === "OR") { if (!v.some((c: any) => matchUser(u, c))) return false; continue; }
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("contains" in v) { if (!String(u[k] ?? "").toLowerCase().includes(String(v.contains).toLowerCase())) return false; continue; }
      if ("in" in v) { if (!v.in.includes(u[k])) return false; continue; }
      if ("not" in v) { if (v.not === null ? u[k] == null : u[k] === v.not) return false; continue; }
      return false;
    }
    if ((u[k] ?? null) !== v) return false;
  }
  return true;
};
const count = (name: string) => async () => { spy.push(name); if (failing.has(name)) throw new Error("db hiccup in " + name); return counts[name] ?? 0; };
const tbl = (name: string) => ({ count: count(name) });
const prismaFake: any = {
  user: {
    findUnique: async ({ where }: any) => { const u = users.find((x) => x.id === where.id); return u ? { ...u } : null; },
    findMany: async ({ where, skip = 0, take = 1000 }: any) => users.filter((u) => matchUser(u, where)).sort((a, b) => b.createdAt - a.createdAt).slice(skip, skip + take).map((u) => ({ ...u })),
    count: async ({ where }: any = {}) => { spy.push("user"); return users.filter((u) => matchUser(u, where)).length; },
  },
  partnerApplication: tbl("partners"), product: tbl("products"), accommodationEnquiry: tbl("stayEnquiries"), experienceEnquiry: tbl("experienceEnquiries"), review: tbl("reviews"), creatorApplication: tbl("creators"), fieldNote: tbl("fieldNotes"), emailLog: tbl("emails"), sponsorLead: tbl("sponsorLeads"), bookingRefund: tbl("refunds"), hostPayout: tbl("payouts"),
  destination: tbl("destinations"), story: tbl("stories"), event: tbl("events"), accommodation: tbl("accommodations"), experience: tbl("experiences"), booking: tbl("upcomingBookings"), order: tbl("orders"), sportTeam: tbl("teams"), sportFixture: tbl("fixtures"), festivalSession: tbl("festivalSessions"), mission: tbl("openMissions"), reward: tbl("rewardsLive"), rewardRedemption: tbl("vouchersReady"), sponsor: tbl("sponsors"), newsletterSubscriber: tbl("subscribers"),
};
(globalThis as any).prisma = prismaFake;
process.env.NEXTAUTH_SECRET = "x".repeat(32);
let n = 0; const addUser = (o: any = {}) => { const u = { id: `u${++n}`, name: `Person ${n}`, email: `p${n}@x.co`, role: "MEMBER", createdAt: new Date(Date.UTC(2026, 0, 1) + n * 3600000), suspendedAt: null, emailVerifiedAt: new Date(), passwordChangedAt: new Date(), invitedAt: null, ...o }; users.push(u); return u; };
const as = (u: any) => { session = u ? { user: { id: u.id, role: u.role, name: u.name } } : null; };
const resetAll = () => { users.length = 0; for (const k of Object.keys(counts)) delete counts[k]; spy.length = 0; failing = new Set(); n = 0; session = null; pathname = "/admin"; };
const expand = async (node: any): Promise<any> => { if (Array.isArray(node)) return Promise.all(node.map(expand)); if (!node || typeof node !== "object" || !node.type) return node; if (typeof node.type === "function" && node.type.constructor?.name === "AsyncFunction") return expand(await node.type(node.props)); const c = node.props?.children; if (c === undefined || typeof node.type === "function") return node; return React.cloneElement(node, undefined, ...(Array.isArray(c) ? await Promise.all(c.map(expand)) : [await expand(c)])); };
const html = async (C: any, props: any = {}) => renderToStaticMarkup(await expand(await C(props))).replace(/<!-- -->/g, "");
const attempt = async (C: any, props: any = {}) => { try { return await html(C, props); } catch (e: any) { return `THROWN:${e.message}`; } };
const pl = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

async function main() {
  const Layout = (await import("@/app/admin/layout")).default as any; const Dash = (await import("@/app/admin/page")).default as any; const Users = (await import("@/app/admin/users/page")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, ok]);
  const lay = async (children: any = <p id="content">page</p>) => renderToStaticMarkup(await expand(await Layout({ children }))).replace(/<!-- -->/g, "");
  const people = () => { resetAll(); return { sup: addUser({ role: "SUPER_ADMIN", name: "Harry Mwakisaghu", email: "harry@x.co" }), adm: addUser({ role: "ADMIN", name: "Amina Admin" }), edt: addUser({ role: "EDITOR", name: "Ed Editor" }), mem: addUser({ role: "MEMBER" }) }; };

  // ===== layout =====
  let P = people(); as(null); t("LAYOUT: signed-out is sent to sign in", (await attempt(Layout, { children: null })) === "THROWN:NEXT_REDIRECT:/login");
  as(P.mem); t("LAYOUT: a member is sent to sign in", (await attempt(Layout, { children: null })) === "THROWN:NEXT_REDIRECT:/login");
  as(P.adm); counts.reviews = 3; counts.refunds = 4; counts.stayEnquiries = 2; let h = await lay();
  t("LAYOUT (admin): the nine sections, the search box, the menu button and the page content are all there", (h.match(/aria-expanded="false"/g) ?? []).length >= 9 && /id="admin-find"/.test(h) && /id="content"/.test(h) && /Places &amp; content/.test(h) && /People &amp; access/.test(h) && /aria-controls="admin-menu"/.test(h));
  t("LAYOUT: waiting counts appear on the folded sections (Stays: 2 enquiries + 4 refunds = 6; Community: 3 reviews) — read live from the database", /aria-label="6 waiting in this section"/.test(h) && /aria-label="3 waiting in this section"/.test(h));
  pathname = "/admin/shop/orders"; h = await lay(); t("LAYOUT: on /admin/shop/orders the Shop section is open with Orders marked current, and the trail above the page reads Admin › Shop › Orders", /aria-current="page"[^>]*>[^<]*(<[^>]+>)*[^<]*Orders/.test(h) && /Admin<\/a> › Shop › <a[^>]*>Orders/.test(h));
  pathname = "/admin"; as(P.edt); h = await lay(); t("LAYOUT (editor): signed in as an editor the menu has no Accounts, no Activity log, no Bookings and no 'People & access' section — and no refunds number is leaked", !/People &amp; access/.test(h) && !/\/admin\/users/.test(h) && !/\/admin\/bookings/.test(h) && !/6 waiting/.test(h) && /3 waiting in this section/.test(h));
  t("LAYOUT (editor): the refunds count is not even queried for someone who can't see it", (() => { spy.length = 0; return true; })() && (await lay(), !spy.includes("refunds")));
  as(P.sup); spy.length = 0; await lay(); t("LAYOUT (super admin): the refunds count IS queried", spy.includes("refunds"));
  as(P.adm); failing = new Set(["reviews", "emails", "refunds"]); h = await lay(); t("LAYOUT: if some of the counts fail the page still renders — the failed badges just aren't shown (a database hiccup can't lock admins out)", /id="content"/.test(h) && !/3 waiting in this section/.test(h) && /2 waiting in this section/.test(h)); failing = new Set();

  // ===== overview =====
  P = people(); as(P.sup); let d = await html(Dash); t("OVERVIEW: greets by first name; with nothing waiting it says so ('all caught up') instead of showing zeros", /Welcome back, Harry/.test(d) && /all caught up/.test(pl(d)) && !/Needs attention[\s\S]*<ul/.test(d));
  counts.refunds = 1; counts.payouts = 2; counts.reviews = 3; counts.stayEnquiries = 2; counts.emails = 0; counts.partners = 5; d = await html(Dash); const items = [...d.matchAll(/<li><a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/li>/g)].map((m) => [m[1], pl(m[2]).replace(/\s+/g, " ").trim()]);
  t("OVERVIEW: 'Needs attention' lists ONLY what is waiting, each a link to the right page with a readable sentence (singular/plural right), zeros omitted", items.length === 5 && items.some((i) => i[0] === "/admin/payouts" && /2 host payouts to send/.test(i[1])) && items.some((i) => i[0] === "/admin/bookings/refunds" && /1 refund to send/.test(i[1])) && items.some((i) => i[0] === "/admin/partners" && /5 partner applications to review/.test(i[1])) && items.some((i) => i[0] === "/admin/reviews" && /3 reviews awaiting approval/.test(i[1])) && items.some((i) => i[0] === "/admin/accommodations/enquiries" && /2 new stay enquiries/.test(i[1])) && !/emails needing/.test(d));
  as(P.edt); d = await html(Dash); t("OVERVIEW (editor): the refund line is hidden from an editor (money), the rest still shows; the quick actions have no account links", !/refund/.test(d) && /partner applications/.test(d) && !/View all accounts/.test(d) && !/Invite staff/.test(d) && !/People &amp; access/.test(d));
  as(P.sup); d = await html(Dash); t("OVERVIEW (admin): quick actions include 'View all accounts' and 'Invite staff'; the 'People & access' glance shows accounts and suspended", /View all accounts/.test(d) && /Invite staff/.test(d) && /People &amp; access/.test(d) && /href="\/admin\/users\?status=suspended"/.test(d));
  counts.destinations = 12; counts.orders = 7; counts.teams = 16; d = await html(Dash); t("OVERVIEW: 'At a glance' groups the totals like the menu, each a link (12 destinations, 7 orders, 16 teams), not 25 equal cards in one list", /At a glance/.test(d) && ["Places &amp; content", "Stays &amp; experiences", "Shop", "Football cup &amp; Taita Week", "Community &amp; sponsors"].every((s) => d.includes(s)) && /<p[^>]*>12<\/p><p[^>]*>Destinations/.test(d) && /<p[^>]*>7<\/p><p[^>]*>Orders/.test(d) && /<p[^>]*>16<\/p><p[^>]*>Cup teams/.test(d) && /href="\/admin\/destinations"/.test(d));
  failing = new Set(["destinations", "orders", "reviews"]); const q0 = console.error; console.error = () => {}; d = await html(Dash); console.error = q0; t("OVERVIEW: failing counts show as 0 and the page still renders", /Welcome back/.test(d)); failing = new Set();
  t("OVERVIEW: headings are real headings in a sensible order (h1 → h2 sections → h3 groups) and each section is labelled", /<h1[^>]*>/.test(d) && (d.match(/<h2/g) ?? []).length === 3 && (d.match(/<h3/g) ?? []).length >= 5 && /aria-labelledby="attention"/.test(d));

  // ===== accounts =====
  P = people(); for (let i = 0; i < 60; i++) addUser({ name: `Member ${i}`, email: `m${i}@x.co`, role: i % 10 === 0 ? "PARTNER" : "MEMBER", suspendedAt: i % 15 === 0 ? new Date() : null, emailVerifiedAt: i % 7 === 0 ? null : new Date() });
  addUser({ role: "ADMIN", name: "Other Admin", email: "otheradmin@x.co" }); addUser({ role: "MEMBER", name: "Invited Person", email: "inv@x.co", invitedAt: new Date(), emailVerifiedAt: null, passwordChangedAt: null });
  const total = users.length; const susp = users.filter((u) => u.suspendedAt).length; const inv = users.filter((u) => u.invitedAt && !u.emailVerifiedAt && !u.passwordChangedAt && !u.suspendedAt).length; const unv = users.filter((u) => !u.emailVerifiedAt && !u.suspendedAt).length;
  const U = async (sp: any = {}) => html(Users, { searchParams: sp });
  for (const [label, who] of [["a member", P.mem], ["an editor", P.edt], ["nobody", null]] as any[]) { as(who); t(`ACCOUNTS: ${label} is sent back to /admin`, (await attempt(Users, { searchParams: {} })) === "THROWN:NEXT_REDIRECT:/admin"); }
  as(P.sup); let u = await U();
  t(`ACCOUNTS: four summary tiles with the real numbers — all accounts (${total}), suspended (${susp}), invite pending (${inv}), email not verified (${unv}) — each a link that filters the list`, [[total, "All accounts", ""], [susp, "Suspended", "?status=suspended"], [inv, "Invite pending", "?status=pending"], [unv, "Email not verified", "?status=unverified"]].every(([v, l, href]: any) => new RegExp(`<a [^>]*href="/admin/users${String(href).replace("?", "\\?")}"[^>]*><p[^>]*>${v}</p><p[^>]*>${l}`).test(u)));
  t("ACCOUNTS: the first tile says how many of them are staff", /\d+ staff/.test(u) && /4 staff/.test(pl(u)) === (users.filter((x) => ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"].includes(x.role)).length === 4));
  t("ACCOUNTS: 'Showing 1–25 of N accounts', 25 rows, newest first, with joined dates, role names and avatar initials", new RegExp(`Showing 1–25 of ${total} accounts`).test(pl(u)) && (u.match(/<tr/g) ?? []).length === 26 && /aria-hidden="true"[^>]*>[A-Z]</.test(u));
  t("ACCOUNTS: page numbers under the list — current page marked aria-current=page, 'Older →' but no '← Newer' on page 1", /aria-label="Pages"/.test(u) && /aria-current="page"[^>]*>1</.test(u) && /Older →/.test(u) && !/← Newer/.test(u));
  u = await U({ page: "3" }); const lastFrom = 51; t(`ACCOUNTS: page 3 shows ${lastFrom}–${Math.min(total, 75)}, with '← Newer' and (being the last page) no 'Older →'`, new RegExp(`Showing ${lastFrom}–${total} of ${total}`).test(pl(u)) && /← Newer/.test(u) && !/Older →/.test(u) && /rel="prev"/.test(u));
  const allSeen = new Set<string>(); for (let pg = 1; pg <= 3; pg++) for (const m of (await U({ page: String(pg) })).matchAll(/href="\/admin\/users\/(u\d+)"/g)) allSeen.add(m[1]); t(`ACCOUNTS: paging through the 3 pages reaches EVERY one of the ${total} accounts (nobody is hidden)`, allSeen.size === total);
  t("ACCOUNTS: nonsense page numbers are clamped, not errors", (await U({ page: "-4" })).includes("Showing 1–25") && (await U({ page: "abc" })).includes("Showing 1–25") && /Showing/.test(await U({ page: "999999" })));
  u = await U({ status: "suspended" }); t(`ACCOUNTS: the Suspended tile shows exactly the ${susp} suspended accounts, each with a 'Suspended' pill, tinted row and a Reinstate button — and no Suspend button`, new RegExp(`Showing 1–${susp} of ${susp}`).test(pl(u)) && (u.match(/>Suspended<\/span>/g) ?? []).length === susp && (u.match(/aria-label="Reinstate /g) ?? []).length === susp && !/aria-label="Suspend /.test(u) && /bg-rust\/\[0\.03\]/.test(u));
  u = await U({ status: "pending" }); t("ACCOUNTS: 'Invite pending' shows only invited staff who haven't joined", /Invited Person/.test(u) && new RegExp(`of ${inv} account`).test(pl(u)) && /Invite pending<\/span>/.test(u));
  u = await U({ status: "unverified" }); t("ACCOUNTS: 'Email not verified' excludes suspended people and invited people are counted as it defines", new RegExp(`of ${unv} account`).test(pl(u)) && !/>Suspended<\/span>/.test(u));
  u = await U({ role: "PARTNER" }); t("ACCOUNTS: role filter works and the filter box keeps the chosen value", (u.match(/>Partner \(host\)<\/td>/g) ?? []).length >= 1 && !/>Member<\/td>/.test(u) && /<option value="PARTNER" selected/.test(u));
  u = await U({ q: "invited" }); t("ACCOUNTS: searching by name finds the person; searching by email works; both case-insensitive", /Invited Person/.test(u) && /Showing 1–1 of 1 account/.test(pl(u)) && /Harry/.test(await U({ q: "HARRY@X.CO" })));
  u = await U({ q: "zzzz-nobody" }); t("ACCOUNTS: no match says so and offers 'Show everyone'", /No accounts match/.test(pl(u)) && /Show everyone/.test(u));
  t("ACCOUNTS: odd search text (wildcards, quotes, tags, huge) is handled without error and without injecting markup", (await Promise.all(["%", "_", "'; DROP TABLE users;--", "<script>alert(1)</script>", "a".repeat(5000)].map((q) => attempt(Users, { searchParams: { q } })))).every((o) => !o.startsWith("THROWN") && !/<script>alert/.test(o)));
  const rowFor = async (name: string) => { const h2 = await U({ q: name }); return h2.split("<tr").slice(1).find((r) => r.includes(name)) ?? ""; /* slice(1): the part before the table holds the search box, which contains the name too */ };
  t("🔒 ACCOUNTS (super admin): can suspend ordinary members and other admins from the list, but has NO controls on their own row", /aria-label="Suspend Member 14"/.test(await rowFor("Member 14")) && /aria-label="Suspend Other Admin"/.test(await rowFor("Other Admin")) && !/aria-label="(Suspend|Reinstate)/.test(await rowFor("Harry Mwakisaghu")) && /Manage/.test(await rowFor("Harry Mwakisaghu")));
  as(P.adm); u = await U();
  t("🔒 ACCOUNTS (admin): can suspend members but has NO suspend control on a super admin, on another admin, or on themselves (the same rule the server enforces)", /aria-label="Suspend Member 14"/.test(await rowFor("Member 14")) && !/aria-label="(Suspend|Reinstate)/.test(await rowFor("Harry Mwakisaghu")) && !/aria-label="(Suspend|Reinstate)/.test(await rowFor("Other Admin")) && !/aria-label="(Suspend|Reinstate)/.test(await rowFor("Amina Admin")));
  t("ACCOUNTS: every row links to the person's page ('Manage'), and the page offers the activity log and 'Invite staff'", users.every((x) => x.id) && (u.match(/>Manage</g) ?? []).length === 25 && /\/admin\/users\/audit/.test(u) && /\/admin\/users\/new/.test(u));
  t("ACCOUNTS: the table is accessible (caption, column headers with scope)", /<caption class="sr-only">/.test(u) && (u.match(/scope="col"/g) ?? []).length === 5);

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ADMIN PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
