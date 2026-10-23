// The menu badge for shop refunds waiting: the counts loader, the menu item and the overview's attention list.
import fs from "fs";
const rows: any[] = []; const flags = { fail: false, calls: 0 };
const counter = (table: string) => ({ count: async (a: any = {}) => { if (table === "orderRefund") { flags.calls++; if (flags.fail) throw new Error("db down"); const ins = a.where?.status?.in; return rows.filter((r) => !ins || ins.includes(r.status)).length; } return 0; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, table: string) => counter(table) });
const read = (f: string) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
async function main() {
  const { loadAdminBadges } = await import("@/lib/admin-badges"); const N = await import("@/lib/admin-nav");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  rows.push({ status: "PENDING" }, { status: "FAILED" }, { status: "SENT" }, { status: "PENDING" });
  const mgr = await loadAdminBadges(true); const other = await loadAdminBadges(false);
  t("THE BADGE COUNTS SHOP REFUNDS STILL TO BE SENT (waiting and failed ones, not the sent ones) and only admins get the number (it is money): 3 of the 4 refunds here, and 0 for anyone else, with the other badges untouched", (mgr as any).orderRefunds === 3 && (other as any).orderRefunds === 0 && (mgr as any).refunds === 0 && Object.keys(mgr).includes("partners") && Object.keys(mgr).includes("payouts"));
  flags.fail = true; let threw = false; let afterFail: any = null; try { afterFail = await loadAdminBadges(true); } catch { threw = true; } flags.fail = false;
  t("ONE FAILING COUNT NEVER BREAKS THE ADMIN AREA: if the refunds count cannot be read, the number is 0 and every other badge still loads (nothing is thrown)", !threw && afterFail?.orderRefunds === 0 && "partners" in afterFail);
  flags.calls = 0; await loadAdminBadges(false); const noCallForOthers = flags.calls === 0;
  t("A NON-ADMIN'S PAGE LOAD DOES NOT EVEN ASK THE DATABASE FOR THE REFUND COUNT", noCallForOthers);
  const all = N.NAV_GROUPS.flatMap((g: any) => g.items); const item = all.find((i: any) => i.href === "/admin/shop/orders"); const att = N.ATTENTION.find((a: any) => a.key === "orderRefunds");
  const iconic = N.ATTENTION.some((a: any) => "icon" in a);
  t("THE MENU AND THE OVERVIEW KNOW IT: the Orders item carries the 'orderRefunds' badge and is admin-only; the 'Needs your attention' list has a line for it ('1 shop refund to send', '3 shop refunds to send') linking to the Refunds to send page, for admins only; it is counted in the bell for admins only and never for anyone else; and if the menu uses icons the new line has one", item?.badge === "orderRefunds" && item?.managers === true && !!att && att.managers === true && att.href === "/admin/shop/orders/refunds" && att.text(1) === "1 shop refund to send" && att.text(3) === "3 shop refunds to send" && (typeof (N as any).attentionTotal !== "function" || ((N as any).attentionTotal({ orderRefunds: 4 }, true) === 4 && (N as any).attentionTotal({ orderRefunds: 4 }, false) === 0)) && (!iconic || "icon" in att) && fs.existsSync("app/admin/shop/orders/refunds/page.tsx"));
  t("THE BADGE HOLDS WHAT IT SAYS ABOUT ITSELF: the loader counts exactly the statuses the Refunds to send page lists as to-do (waiting and failed), and an editor's menu does not contain Orders at all", /status: \{ in: \["PENDING", "FAILED"\] \}/.test(read("lib/admin-badges.ts")) && /status: \{ in: \["PENDING", "FAILED"\] \}/.test(read("app/admin/shop/orders/refunds/page.tsx")) && !N.visibleGroups("EDITOR").some((g: any) => g.items.some((i: any) => i.href === "/admin/shop/orders")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ORDER BADGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
