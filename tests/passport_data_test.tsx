import fs from "fs";
const Module = require("module"); const origLoad = Module._load; let session: any = null;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/cache") return { revalidatePath() {} };
  return origLoad.call(this, r, ...x);
};
const T: Record<string, any[]> = {}; const table = (m: string) => (T[m] ??= []);
const match = (row: any, where: any): boolean => !where || Object.entries(where).every(([k, v]: [string, any]) => { if (v && typeof v === "object" && !(v instanceof Date)) { if ("in" in v) return v.in.includes(row?.[k]); return row?.[k] != null && match(row[k], v); } return row?.[k] === v; });
const sorted = (rows: any[], o: any) => { if (!o) return rows; const [k, d] = Object.entries(Array.isArray(o) ? o[0] : o)[0] as [string, string]; return [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (d === "desc" ? -1 : 1)); };
const handler = (model: string) => ({
  findMany: async (a: any = {}) => sorted(table(model).filter((r) => match(r, a.where)), a.orderBy),
  findUnique: async (a: any) => table(model).find((r) => match(r, a.where)) ?? null,
  findFirst: async (a: any) => table(model).find((r) => match(r, a.where)) ?? null,
  count: async (a: any = {}) => table(model).filter((r) => match(r, a.where)).length,
});
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => handler(model) }); process.env.NEXTAUTH_SECRET = "x".repeat(32);
const warn = console.warn; console.warn = () => {};
async function main() {
  const { loadPassport } = await import("@/lib/passport-data"); const A = await import("@/lib/actions/passport"); const { distanceMetres } = await import("@/lib/passport");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const d = (id: string, o: any = {}) => ({ id, slug: id, name: id.toUpperCase(), region: "Reg", category: "WILD", altitudeM: 600, latitude: -3.4, longitude: 38.55, checkinRadiusM: 300, status: "PUBLISHED", ...o });
  const day = (n: number) => new Date(Date.UTC(2026, 9, n, 8, 0, 0));
  const seed = () => {
    for (const k of Object.keys(T)) delete T[k];
    T.user = [{ id: "u1", name: "Neema Mwadime", points: 120, createdAt: new Date("2026-09-03T08:00:00Z") }, { id: "u2", name: "Someone Else", points: 999, createdAt: new Date("2026-01-01T00:00:00Z") }];
    T.destination = [d("voi", { altitudeM: 580, category: "PEOPLE" }), d("jipe", { altitudeM: 700, category: "WILD" }), d("mzima", { altitudeM: 600, latitude: null, longitude: null, category: "WILD" }), d("ngangao", { altitudeM: 1800, category: "ADVENTURE", checkinRadiusM: 150 }), d("nohigh", { altitudeM: null, category: "FOOD" }), d("draft", { status: "DRAFT", category: "SPORT" })];
    T.visit = [{ userId: "u1", destinationId: "voi", method: "QR", visitedAt: day(3) }, { userId: "u1", destinationId: "jipe", method: "SELF_REPORTED", visitedAt: day(4) }, { userId: "u1", destinationId: "draft", method: "QR", visitedAt: day(5) }, { userId: "u2", destinationId: "ngangao", method: "LOCATION", visitedAt: day(6) }, { userId: "u2", destinationId: "mzima", method: "QR", visitedAt: day(6) }];
    T.badge = [{ id: "b9", key: "TAITA_LEGEND", label: "Taita Legend", description: "Visit every place." }, { id: "b2", key: "TAITA_WILD", label: "Taita Wild", description: "Visit a wild place." }, { id: "b1", key: "TAITA_EXPLORER", label: "Taita Explorer", description: "Make your first visit." }, { id: "b8", key: "TAITA_INSIDER", label: "Taita Insider", description: "Visit three kinds of place." }, { id: "bz", key: "TEAM_ZEBRA", label: "Zebra Spotter", description: "Added by the team." }, { id: "ba", key: "TEAM_ANT", label: "Ant Finder", description: "Added by the team." }];
    T.userBadge = [{ userId: "u1", badgeId: "b1", earnedAt: day(3) }, { userId: "u2", badgeId: "b2", earnedAt: day(6) }, { userId: "u2", badgeId: "b8", earnedAt: day(6) }];
    T.placeWish = [{ userId: "u1", destinationId: "ngangao", createdAt: day(7) }, { userId: "u1", destinationId: "mzima", createdAt: day(9) }, { userId: "u1", destinationId: "voi", createdAt: day(8) }, { userId: "u1", destinationId: "draft", createdAt: day(10) }, { userId: "u2", destinationId: "jipe", createdAt: day(9) }];
  };
  seed(); const P: any = await loadPassport("u1"); const place = (id: string) => P.places.find((p: any) => p.id === id);
  t("THE HOLDER is the signed-in person, with their own points and the day they joined (the Issued date); an unknown person gets nothing", P.holder.name === "Neema Mwadime" && P.points === 120 && P.holder.issuedAt === "2026-09-03T08:00:00.000Z" && (await loadPassport("nobody")) === null);
  t("ONLY PUBLISHED PLACES have a slot (a draft place never appears, even if a visit to it exists)", P.places.length === 5 && !P.places.some((p: any) => p.id === "draft"));
  t("EACH PLACE'S STATE comes from how the visit was made: QR is a stamp with its date, 'I've been here' is marked, no visit is open (and has no date)", place("voi").state === "stamped" && place("voi").method === "QR" && place("voi").visitedAt === day(3).toISOString() && place("jipe").state === "marked" && place("jipe").method === "SELF_REPORTED" && place("mzima").state === "open" && place("mzima").visitedAt === null && place("mzima").method === null);
  t("A PLACE KEEPS WHAT THE CHECK-IN NEEDS: whether it can be located (it has coordinates), its own radius, its height (or none), and its kind", place("mzima").canLocate === false && place("voi").canLocate === true && place("ngangao").radiusM === 150 && place("voi").radiusM === 300 && place("nohigh").altitudeM === null && place("ngangao").altitudeM === 1800 && place("voi").category === "PEOPLE");
  t("ANOTHER PERSON'S STAMPS NEVER APPEAR: u2 stamped Ngangao and Mzima, but for u1 both are open", place("ngangao").state === "open" && place("mzima").state === "open");
  const P2: any = await loadPassport("u2"); const p2 = (id: string) => P2.places.find((p: any) => p.id === id);
  t("…and each person sees their own: u2's passport has u2's two stamps and none of u1's", p2("ngangao").state === "stamped" && p2("ngangao").method === "LOCATION" && p2("mzima").state === "stamped" && p2("voi").state === "open" && P2.holder.name === "Someone Else" && P2.points === 999);
  t("WANTED means saved AND not yet visited: Ngangao and Mzima are wanted; Voi is saved but already stamped so it is not; a saved draft place is ignored; u2's saves are not u1's", place("ngangao").wanted && place("mzima").wanted && !place("voi").wanted && !place("jipe").wanted);
  t("WISHES come newest first, published places only, with their height for the tag", P.wishes.map((w: any) => w.id).join() === "mzima,voi,ngangao" && P.wishes[2].altitudeM === 1800 && !P.wishes.some((w: any) => w.id === "draft"));
  const E = (k: string) => P.endorsements.find((e: any) => e.key === k);
  t("ENDORSEMENTS: the standard ones in their fixed order (Explorer, Wild, … Insider, Legend), then any the team added, by name — here Explorer, Wild, Insider, Legend, then Ant Finder, Zebra Spotter", P.endorsements.map((e: any) => e.key).join() === "TAITA_EXPLORER,TAITA_WILD,TAITA_INSIDER,TAITA_LEGEND,TEAM_ANT,TEAM_ZEBRA");
  t("AN EARNED ENDORSEMENT has the day it was earned and no progress; the other person's earned ones are not mine", E("TAITA_EXPLORER").earned && E("TAITA_EXPLORER").earnedAt === day(3).toISOString() && E("TAITA_EXPLORER").progress === null && !E("TAITA_WILD").earned && !E("TAITA_INSIDER").earned);
  t("INSIDER PROGRESS is the real rule: visits in three different KINDS of place. u1 has visited PEOPLE and WILD places (self-marked counts, as the check-in code counts it), so 2 of 3; the visit to a draft place (SPORT) does not count", E("TAITA_INSIDER").progress?.have === 2 && E("TAITA_INSIDER").progress?.need === 3);
  t("LEGEND PROGRESS is the real rule: every published place. u1 has visited 2 of the 5 published places (the draft visit does not count)", E("TAITA_LEGEND").progress?.have === 2 && E("TAITA_LEGEND").progress?.need === 5);
  t("KIND-BASED ENDORSEMENTS (Wild …) and team-added ones show NO invented progress: they are earned by a single visit to a place of that kind, so there is nothing to count", E("TAITA_WILD").progress === null && E("TEAM_ZEBRA").progress === null);
  T.visit.push({ userId: "u1", destinationId: "mzima", method: "QR", visitedAt: day(10) }); const P2b: any = await loadPassport("u1"); const Eb = (k: string) => P2b.endorsements.find((e: any) => e.key === k);
  t("INSIDER COUNTS KINDS OF PLACE, NOT VISITS: a third visit (to another WILD place) leaves Insider at 2 of 3 while the Legend count rises to 3 of 5", Eb("TAITA_INSIDER").progress?.have === 2 && Eb("TAITA_LEGEND").progress?.have === 3);
  T.visit.push({ userId: "u1", destinationId: "ngangao", method: "QR", visitedAt: day(11) }, { userId: "u1", destinationId: "nohigh", method: "LOCATION", visitedAt: day(11) }); const P3: any = await loadPassport("u1"); const E3 = (k: string) => P3.endorsements.find((e: any) => e.key === k);
  t("PROGRESS GROWS AND STOPS AT THE TARGET: after two more visits (ADVENTURE and FOOD) Insider shows 3 of 3 (never more) and Legend 5 of 5", E3("TAITA_INSIDER").progress?.have === 3 && E3("TAITA_LEGEND").progress?.have === 5);
  T.destination = [d("only", { altitudeM: 600 })]; T.visit = []; const P4: any = await loadPassport("u1");
  t("WITH NO PLACES AT ALL there is no Legend progress to show (no division by nothing) and nothing breaks", P4.places.length === 1 && P4.endorsements.find((e: any) => e.key === "TAITA_LEGEND")?.progress?.need === 1 && (T.destination = [], (await loadPassport("u1") as any).endorsements.find((e: any) => e.key === "TAITA_LEGEND").progress === null));
  const src = fs.readFileSync("lib/passport-data.ts", "utf8");
  t("EVERY QUERY ABOUT A PERSON IS SCOPED TO THEM: visits, earned endorsements and saved places are all read with the person's id; nothing is read by a client-supplied id", /prisma\.visit\.findMany\(\{ where: \{ userId \}/.test(src) && /prisma\.userBadge\.findMany\(\{ where: \{ userId \}/.test(src) && /prisma\.placeWish\.findMany\(\{ where: \{ userId \}/.test(src) && /prisma\.user\.findUnique\(\{ where: \{ id: userId \}/.test(src) && !/headers\(|cookies\(|searchParams/.test(src));
  // ===== check-in failures now carry a code the page can translate (the English text is unchanged) =====
  seed(); session = null; let r: any = await A.checkInWithLocation("voi", -3.4, 38.55, 20);
  t("CHECK-IN CODES (signed out): 'sign_in', with the same English text as before", r.code === "sign_in" && r.error === "Please sign in to check in.");
  session = { user: { id: "u1" } };
  r = await A.checkInWithLocation("voi", NaN, 38.55, 20); const a1 = r; r = await A.checkInWithLocation("voi", 95, 38.55, 20); const a2 = r; r = await A.checkInWithLocation("voi", -3.4, 38.55, -1); const a3 = r;
  t("CHECK-IN CODES (nonsense location): 'bad_location' for a missing, out-of-range or negative-accuracy reading", a1.code === "bad_location" && a2.code === "bad_location" && a3.code === "bad_location");
  r = await A.checkInWithLocation("voi", -3.4, 38.55, 5000); t("CHECK-IN CODES (a vague fix): 'imprecise' when the phone cannot say where it is within 200 m", r.code === "imprecise" && /precise enough/.test(r.error));
  r = await A.checkInWithLocation("draft", -3.4, 38.55, 20); const u1 = r; r = await A.checkInWithLocation("nonexistent", -3.4, 38.55, 20);
  t("CHECK-IN CODES (not available): 'unavailable' for a draft place and for one that does not exist", u1.code === "unavailable" && r.code === "unavailable");
  r = await A.checkInWithLocation("mzima", -3.4, 38.55, 20); t("CHECK-IN CODES (no coordinates): 'no_location' for a place that can only be stamped by QR", r.code === "no_location" && /QR/.test(r.error));
  r = await A.checkInWithLocation("voi", -3.0, 38.0, 20); const far = distanceMetres(-3.0, 38.0, -3.4, 38.55);
  t("CHECK-IN CODES (too far): 'too_far' with the distance in metres (rounded) so the page can say '41 km' in any language, and the English sentence is unchanged", r.code === "too_far" && r.distanceM === Math.round(far) && r.distanceM > 40000 && /You're about .* from VOI/.test(r.error));
  seed(); session = { user: { id: "u9" } }; let last: any = null; for (let i = 0; i < 11; i++) last = await A.checkInWithLocation("voi", -3.0, 38.0, 20);
  t("CHECK-IN CODES (limited): ten attempts in ten minutes, then 'too_many'", last.code === "too_many");
  console.warn = warn; let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PASSPORT DATA CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
