import fs from "fs"; import path from "path";
async function main() {
  const N = await import("@/lib/admin-nav"); const U = await import("@/lib/user-admin");
  const { NAV_GROUPS, OVERVIEW, visibleGroups, activeItem, searchNav, groupBadge, badgeText, ATTENTION } = N;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, ok]);
  const all = NAV_GROUPS.flatMap((g) => g.items);

  // ===== every admin page is reachable from the menu =====
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name === "page.tsx" ? [d] : []));
  const routes = walk("app/admin").map((d) => ("/" + path.relative("app", d).split(path.sep).join("/")).replace(/\[[^\]]+\]/g, "abc"));
  const everyGroup = NAV_GROUPS; const orphans = routes.filter((r) => !activeItem(r, everyGroup));
  t(`NO ORPHAN PAGES: all ${routes.length} admin pages sit under a menu entry (so a page added without a menu entry fails here)${orphans.length ? " — ORPHANS: " + orphans.join(", ") : ""}`, orphans.length === 0 && routes.length >= 60);
  const OLD = ["/admin", "/admin/destinations", "/admin/stories", "/admin/events", "/admin/cup/teams", "/admin/cup/players", "/admin/cup/fixtures", "/admin/cup/venues", "/admin/week/sessions", "/admin/week/venues", "/admin/accommodations", "/admin/accommodations/enquiries", "/admin/experiences", "/admin/experiences/enquiries", "/admin/shop/products", "/admin/shop/orders", "/admin/partners", "/admin/reviews", "/admin/creators", "/admin/missions", "/admin/field-notes", "/admin/impact", "/admin/newsletter", "/admin/qr", "/admin/users", "/admin/bookings", "/admin/emails", "/admin/rewards", "/admin/rewards/redemptions", "/admin/sponsors", "/admin/sponsors/packages", "/admin/sponsors/leads"];
  const hrefs = new Set([OVERVIEW.href, ...all.map((i) => i.href)]); t(`NOTHING LOST: all ${OLD.length} links of the old flat menu are still in the new one`, OLD.every((h) => hrefs.has(h)));
  t("every menu link points at a page that exists (no dead links)", all.every((i) => routes.includes(i.href)) && routes.includes("/admin"));
  t("no duplicate addresses or labels; every section has entries; sections have unique ids", new Set(all.map((i) => i.href)).size === all.length && new Set(all.map((i) => i.label)).size === all.length && NAV_GROUPS.every((g) => g.items.length > 0) && new Set(NAV_GROUPS.map((g) => g.id)).size === NAV_GROUPS.length);
  t(`the 32-item flat list is now ${NAV_GROUPS.length} sections (largest has ${Math.max(...NAV_GROUPS.map((g) => g.items.length))} entries)`, NAV_GROUPS.length === 9 && Math.max(...NAV_GROUPS.map((g) => g.items.length)) <= 7);

  // ===== who sees what =====
  const names = (role: string) => visibleGroups(role).flatMap((g) => g.items.map((i) => i.href));
  for (const role of ["SUPER_ADMIN", "ADMIN"]) t(`${role} sees Accounts, Activity log and Bookings & refunds`, ["/admin/users", "/admin/users/audit", "/admin/bookings"].every((h) => names(role).includes(h)) && visibleGroups(role).some((g) => g.id === "people"));
  for (const role of ["EDITOR", "CONTENT_MANAGER", "MEMBER", "PARTNER", "", "nonsense"]) t(`${JSON.stringify(role)} does NOT see accounts or money screens, and the empty 'People & access' section disappears`, !["/admin/users", "/admin/users/audit", "/admin/bookings"].some((h) => names(role).includes(h)) && !visibleGroups(role).some((g) => g.id === "people") && visibleGroups(role).every((g) => g.items.length > 0));
  t("filtering never changes the master list (no mutation)", (() => { const before = JSON.stringify(NAV_GROUPS); visibleGroups("EDITOR"); return JSON.stringify(NAV_GROUPS) === before; })());
  { const staff = (await import("@/lib/user-admin")); t("the menu's idea of 'manager' is the same as the rest of the app's (admin + super admin only)", ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER", "MEMBER", "PARTNER", "x"].every((r) => (names(r).includes("/admin/users")) === staff.isManager(r))); }

  // ===== which entry is current =====
  const cur = (p: string, role = "SUPER_ADMIN") => activeItem(p, visibleGroups(role))?.item.label ?? null;
  const table: [string, string | null][] = [["/admin", "Overview"], ["/admin/", "Overview"], ["/admin?x=1", "Overview"], ["/admin/destinations", "Destinations"], ["/admin/destinations/new", "Destinations"], ["/admin/destinations/abc/qr", "Destinations"], ["/admin/users", "Accounts"], ["/admin/users/abc", "Accounts"], ["/admin/users/audit", "Activity log"], ["/admin/users/new", "Accounts"], ["/admin/accommodations", "Accommodations"], ["/admin/accommodations/enquiries", "Stay enquiries"], ["/admin/accommodations/abc", "Accommodations"], ["/admin/rewards", "Rewards"], ["/admin/rewards/redemptions", "Vouchers"], ["/admin/sponsors/leads/abc", "Leads"], ["/admin/sponsors/packages/new", "Packages"], ["/admin/bookings/refunds", "Bookings & refunds"], ["/admin/storiesfoo", null], ["/admin/usersx", null], ["/administrator", null], ["/shop", null], ["", null]];
  for (const [p, want] of table) t(`CURRENT PAGE ${JSON.stringify(p)} -> ${want ?? "(none)"}`, cur(p) === want);
  t("an editor on a page they can't see in the menu (e.g. /admin/users) gets no highlighted entry rather than a wrong one", cur("/admin/users", "EDITOR") === null);
  t("the section that holds the current page is reported (for opening it and for the trail)", activeItem("/admin/users/audit", NAV_GROUPS)?.group?.id === "people" && activeItem("/admin", NAV_GROUPS)?.group === null);

  // ===== find a page =====
  const find = (q: string, role = "SUPER_ADMIN") => searchNav(q, visibleGroups(role)).map((r) => r.item.label);
  t("SEARCH 'refund' finds Bookings & refunds", find("refund").includes("Bookings & refunds") || find("refunds").includes("Bookings & refunds"));
  t("SEARCH 'accounts', 'users', 'suspend', 'staff' all find Accounts", ["accounts", "users", "suspend", "staff"].every((q) => find(q).includes("Accounts")));
  t("SEARCH is case-insensitive and ignores extra spaces", find("  ACCOUNTS  ").includes("Accounts") && find("Stay   ENQ").includes("Stay enquiries"));
  t("SEARCH by section name: 'shop' finds Products and Orders", find("shop").includes("Products") && find("shop").includes("Orders"));
  t("SEARCH needs EVERY word to match ('shop refund' finds nothing), and the section name counts ('stay refund' finds Bookings & refunds, which sits in 'Stays & experiences')", find("shop refund").length === 0 && find("stay refund").includes("Bookings & refunds"));
  t("SEARCH: empty, spaces and gibberish return nothing (the normal menu is shown)", find("").length === 0 && find("   ").length === 0 && find("zzzxxyy").length === 0);
  t("SEARCH respects permissions: an editor searching 'accounts' or 'refunds' finds nothing", find("accounts", "EDITOR").length === 0 && find("refunds", "EDITOR").length === 0 && find("users", "EDITOR").length === 0);
  t("SEARCH 'home' finds the Overview", find("home").includes("Overview"));
  t("SEARCH is safe with odd input (regex characters, very long text)", (() => { try { return find("(((").length === 0 && find("a".repeat(5000)).length === 0 && find("\\").length === 0; } catch { return false; } })());

  // ===== badges =====
  const g = NAV_GROUPS.find((x) => x.id === "stays")!; t("SECTION BADGE: the waiting items in a section add up (2 stay enquiries + 1 experience enquiry + 4 refunds + 3 partner applications = 10)", groupBadge(g, { stayEnquiries: 2, experienceEnquiries: 1, refunds: 4, partners: 3 }) === 10);
  t("SECTION BADGE ignores zero, negative and missing counts, and items without a badge", groupBadge(g, {}) === 0 && groupBadge(g, { stayEnquiries: -5, refunds: 0 }) === 0 && groupBadge(NAV_GROUPS.find((x) => x.id === "cup")!, { reviews: 9 }) === 0);
  t("BADGE TEXT caps at 99+", badgeText(7) === "7" && badgeText(99) === "99" && badgeText(100) === "99+" && badgeText(12345) === "99+");
  const usedKeys = new Set(all.map((i) => i.badge).filter(Boolean)); t("every badge key used in the menu has a line in the overview's 'needs attention' list, and vice versa", [...usedKeys].every((k) => ATTENTION.some((a) => a.key === k)) && ATTENTION.every((a) => usedKeys.has(a.key)));
  t("the attention list's links all go to real pages, and exactly four kinds are for admins only: booking refunds, shop refunds and payouts (money) and the error log (technical details)", ATTENTION.every((a) => routes.includes(a.href)) && ATTENTION.find((a) => a.key === "refunds")!.managers === true && ATTENTION.find((a) => a.key === "payouts")!.managers === true && ATTENTION.find((a) => a.key === "errors")!.managers === true && ATTENTION.filter((a) => a.managers).map((a) => a.key).sort().join() === "errors,orderRefunds,payouts,refunds");
  t("HOST PAYOUTS in the menu: under Stays & experiences, admins and super admins only, with a waiting badge, findable by 'money', 'commission', 'earnings' and 'pay hosts'; editors never see it", all.find((i) => i.href === "/admin/payouts")?.badge === "payouts" && all.find((i) => i.href === "/admin/payouts")?.managers === true && NAV_GROUPS.find((g) => g.id === "stays")!.items.some((i) => i.href === "/admin/payouts") && ["money", "commission", "earnings", "pay hosts"].every((q) => searchNav(q as string, visibleGroups("ADMIN")).some((r) => r.item.href === "/admin/payouts")) && !visibleGroups("EDITOR").flatMap((g) => g.items.map((i) => i.href)).includes("/admin/payouts") && visibleGroups("SUPER_ADMIN").flatMap((g) => g.items.map((i) => i.href)).includes("/admin/payouts") && ATTENTION.find((a) => a.key === "payouts")!.text(1) === "1 host payout to send" && ATTENTION.find((a) => a.key === "payouts")!.text(2) === "2 host payouts to send");
  t("attention sentences read correctly for 1 and for many", ATTENTION.find((a) => a.key === "refunds")!.text(1) === "1 refund to send" && ATTENTION.find((a) => a.key === "refunds")!.text(3) === "3 refunds to send" && ATTENTION.find((a) => a.key === "stayEnquiries")!.text(1) === "1 new stay enquiry" && ATTENTION.find((a) => a.key === "stayEnquiries")!.text(2) === "2 new stay enquiries" && ATTENTION.every((a) => a.text(1).startsWith("1 ") && a.text(2).startsWith("2 ")));

  // ===== page numbers under the accounts list =====
  const pn = (p: number, n: number) => JSON.stringify(U.pageNumbers(p, n));
  t("PAGE NUMBERS: one page -> none; 2 pages -> 1 2; 5 pages -> all", pn(1, 1) === "[]" && pn(1, 0) === "[]" && pn(1, 2) === "[1,2]" && pn(3, 5) === "[1,2,3,4,5]");
  t("PAGE NUMBERS: long lists show the first, the last and a window with gaps (…)", pn(1, 10) === "[1,2,3,null,10]" && pn(5, 10) === "[1,null,3,4,5,6,7,null,10]" && pn(10, 10) === "[1,null,8,9,10]" && pn(4, 10) === "[1,2,3,4,5,6,null,10]");
  t("PAGE NUMBERS: never lists a page outside 1..N, never repeats, always ascending", (() => { for (let n = 2; n < 40; n++) for (let p = 1; p <= n; p++) { const r = U.pageNumbers(p, n).filter((x): x is number => x !== null); if (r.some((x) => x < 1 || x > n) || new Set(r).size !== r.length || r.some((x, i) => i > 0 && x <= r[i - 1]) || !r.includes(p) || !r.includes(1) || !r.includes(n)) return false; } return true; })());

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ADMIN MENU CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
