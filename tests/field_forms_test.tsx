import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load;
let session: any = { user: { id: "u-admin", role: "ADMIN" } }; const writes: { op: string; args: any }[] = []; let existing: any = null;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "@/lib/auth") return { authOptions: {}, ADMIN_ROLES: ["ADMIN", "SUPER_ADMIN", "EDITOR", "CONTENT_MANAGER"], PARTNER_ROLES: ["PARTNER", "SELLER", "ADMIN", "SUPER_ADMIN", "EDITOR", "CONTENT_MANAGER"] };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next/navigation") return { redirect: (u: string) => { throw Object.assign(new Error("REDIRECT"), { redirectTo: u }); }, useRouter: () => ({}) };
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt }) };
  return origLoad.call(this, r, ...x);
};
const model = (name: string) => new Proxy({}, { get: (_t, m: string) => async (args?: any) => { if (m === "create" || m === "update" || m === "delete") writes.push({ op: `${name}.${m}`, args }); if (m === "findUnique") return existing; return m === "findMany" ? [] : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, n: string) => model(n) });
import { renderToStaticMarkup } from "react-dom/server";
const fd = (o: Record<string, string | string[]>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x); return f; };
const run = async (fn: () => Promise<any>) => { writes.length = 0; try { await fn(); return { threw: null as any, redirect: null as any }; } catch (e: any) { return e?.redirectTo ? { threw: null, redirect: e.redirectTo } : { threw: e, redirect: null }; } };

async function main() {
  const A = await import("@/lib/actions/listings"); const AD = await import("@/lib/actions/admin");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const expBase = { name: "The ridge walk", category: "ADVENTURE", region: "Taita Hills", description: "A morning on the ridge.", image: "https://example.org/a.jpg", status: "PUBLISHED" };
  const stayBase = { name: "The hill house", type: "HOMESTAY", region: "Wundanyi", description: "A family home on the hill.", image: "https://example.org/a.jpg", status: "PUBLISHED" };
  const guideExp = { altitudeM: "1,420", difficulty: "MODERATE", elevationGainM: "350", hostName: "Hosea Mwamburi", hostRole: "Guide", hostQuote: "I know every stone on this ridge." };

  // ===== admin: experience =====
  session = { user: { id: "u-admin", role: "ADMIN" } };
  let r = await run(() => A.saveExperience(null, fd({ ...expBase, ...guideExp })));
  let d = writes.find((w) => w.op === "experience.create")?.args.data;
  t("EXPERIENCE (admin, new): altitude, difficulty, climb and the guide are saved with the listing", r.redirect === "/admin/experiences" && d.altitudeM === 1420 && d.difficulty === "MODERATE" && d.elevationGainM === 350 && d.hostName === "Hosea Mwamburi" && d.hostRole === "Guide" && d.hostQuote === "I know every stone on this ridge." && !("moods" in d));
  r = await run(() => A.saveExperience("x1", fd({ ...expBase, altitudeM: "", difficulty: "", elevationGainM: "", hostName: "", hostRole: "", hostQuote: "" })));
  d = writes.find((w) => w.op === "experience.update")?.args.data;
  t("EXPERIENCE (admin, edit with empty boxes): the old values are CLEARED, not silently kept", !!d && d.altitudeM === null && d.difficulty === null && d.elevationGainM === null && d.hostName === null && d.hostRole === null && d.hostQuote === null);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, altitudeM: "abc" }))); t("EXPERIENCE: a bad altitude is refused with a plain message and NOTHING is written", !!r.threw && /Altitude must be a whole number/.test(r.threw.message) && writes.length === 0);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, hostRole: "Guide", hostQuote: "Hi" }))); d = writes.find((w) => w.op === "experience.create")?.args.data; t("EXPERIENCE: a role or quote without a name does not crash the save; they are simply not stored", r.redirect === "/admin/experiences" && !!d && d.hostName === null && d.hostRole === null && d.hostQuote === null);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, altitudeM: "1420 m" }))); d = writes.find((w) => w.op === "experience.create")?.args.data; t("EXPERIENCE: '1420 m' (the entry that crashed the save) now saves as 1420", r.redirect === "/admin/experiences" && !!d && d.altitudeM === 1420);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, difficulty: "EXTREME" }))); t("EXPERIENCE: an unknown difficulty is refused", !!r.threw && writes.length === 0);
  session = { user: { id: "u-m", role: "MEMBER" } }; r = await run(() => A.saveExperience(null, fd({ ...expBase, ...guideExp }))); t("🔒 EXPERIENCE: a non-admin still can't save (unchanged), and nothing is written", !!r.threw && /Admin access required/.test(r.threw.message) && writes.length === 0);

  session = { user: { id: "u-admin", role: "ADMIN" } };
  r = await run(() => A.saveExperience(null, fd({ ...expBase, latitude: "-3.39833", longitude: "38.36028" }))); d = writes.find((w) => w.op === "experience.create")?.args.data; t("EXPERIENCE: a position on the map is saved", r.redirect === "/admin/experiences" && !!d && d.latitude === -3.39833 && d.longitude === 38.36028);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, latitude: "38.36028", longitude: "-3.39833" }))); t("EXPERIENCE: swapped latitude and longitude are refused with a clear message and NOTHING is written", !!r.threw && /look swapped/.test(r.threw.message) && writes.length === 0);
  r = await run(() => A.saveExperience("x1", fd({ ...expBase, latitude: "", longitude: "" }))); d = writes.find((w) => w.op === "experience.update")?.args.data; t("EXPERIENCE (edit, empty boxes): the old position is CLEARED", !!d && d.latitude === null && d.longitude === null);
  r = await run(() => A.saveExperience(null, fd({ ...expBase, latitude: "-3.4" }))); t("EXPERIENCE: only one of the two numbers is refused", !!r.threw && /both/.test(r.threw.message) && writes.length === 0);
  // ===== admin: accommodation =====
  session = { user: { id: "u-admin", role: "ADMIN" } };
  r = await run(() => A.saveAccommodation(null, fd({ ...stayBase, altitudeM: "1500", hostName: "Mama Njeri", hostRole: "Host", hostQuote: "Karibu.", moods: ["quiet", "view", "bogus"] })));
  d = writes.find((w) => w.op === "accommodation.create")?.args.data;
  t("STAY (admin): altitude, host and moods saved; unknown moods dropped; no difficulty or climb on a stay", !!d && d.altitudeM === 1500 && d.hostName === "Mama Njeri" && d.moods.join() === "quiet,view" && !("difficulty" in d) && !("elevationGainM" in d));
  r = await run(() => A.saveAccommodation("a1", fd({ ...stayBase }))); d = writes.find((w) => w.op === "accommodation.update")?.args.data;
  t("STAY (edit, nothing ticked): moods are cleared to an empty list and the host cleared", !!d && Array.isArray(d.moods) && d.moods.length === 0 && d.hostName === null && d.altitudeM === null);

  // ===== partners =====
  session = { user: { id: "u-p1", role: "PARTNER" } }; existing = { id: "x9", ownerId: "u-p1" };
  r = await run(() => A.savePartnerExperience("x9", fd({ ...expBase, ...guideExp })));
  d = writes.find((w) => w.op === "experience.update")?.args.data; t("EXPERIENCE (partner, own listing): the new facts are saved", !!d && d.altitudeM === 1420 && d.hostName === "Hosea Mwamburi" && d.difficulty === "MODERATE");
  existing = { id: "x9", ownerId: "someone-else" }; r = await run(() => A.savePartnerExperience("x9", fd({ ...expBase, ...guideExp })));
  t("🔒 EXPERIENCE (partner, someone else's listing): refused before anything is written (unchanged)", !!r.threw && /only edit your own/.test(r.threw.message) && writes.length === 0);
  existing = null; r = await run(() => A.savePartnerExperience(null, fd({ ...expBase, ...guideExp }))); d = writes.find((w) => w.op === "experience.create")?.args.data;
  t("EXPERIENCE (partner, new): facts saved and the partner becomes the owner", !!d && d.altitudeM === 1420 && d.ownerId === "u-p1");
  r = await run(() => A.savePartnerExperience(null, fd({ ...expBase, altitudeM: "99999" }))); t("EXPERIENCE (partner): an altitude above Kenya's highest point is refused", !!r.threw && writes.length === 0);
  existing = { id: "a9", ownerId: "u-p1" }; r = await run(() => A.savePartnerAccommodation("a9", fd({ ...stayBase, altitudeM: "1500", moods: ["family"], hostName: "Baba Joseph" })));
  d = writes.find((w) => w.op === "accommodation.update")?.args.data; t("STAY (partner, own listing): altitude, mood and host saved", !!d && d.altitudeM === 1500 && d.moods.join() === "family" && d.hostName === "Baba Joseph");
  existing = { id: "a9", ownerId: "other" }; r = await run(() => A.savePartnerAccommodation("a9", fd({ ...stayBase }))); t("🔒 STAY (partner, someone else's): refused, nothing written", !!r.threw && writes.length === 0);
  session = { user: { id: "u-m", role: "MEMBER" } }; r = await run(() => A.savePartnerAccommodation(null, fd({ ...stayBase }))); t("🔒 STAY (partner action, a plain member): refused", !!r.threw && /Partner access required/.test(r.threw.message) && writes.length === 0);

  // ===== places =====
  session = { user: { id: "u-admin", role: "ADMIN" } }; const placeBase = { name: "Wundanyi viewpoint", category: "WILD", region: "Wundanyi", blurb: "A long view.", image: "https://example.org/a.jpg", status: "PUBLISHED" };
  r = await run(() => AD.saveDestination(null, fd({ ...placeBase, altitudeM: "1,640" }))); d = writes.find((w) => w.op === "destination.create")?.args.data; t("PLACE (new): altitude saved", !!d && d.altitudeM === 1640);
  r = await run(() => AD.saveDestination("d1", fd({ ...placeBase, altitudeM: "" }))); d = writes.find((w) => w.op === "destination.update")?.args.data; t("PLACE (edit, empty box): altitude cleared; coordinates still cleared when blank (unchanged)", !!d && d.altitudeM === null && d.latitude === null && d.longitude === null);
  r = await run(() => AD.saveDestination(null, fd({ ...placeBase, altitudeM: "-3" }))); t("PLACE: a negative altitude is refused, nothing written", !!r.threw && writes.length === 0);
  r = await run(() => AD.saveDestination(null, fd({ ...placeBase, latitude: "-3.4" }))); t("PLACE: the existing 'both coordinates or neither' rule still holds", !!r.threw && /both latitude and longitude/.test(r.threw.message) && writes.length === 0);
  r = await run(() => AD.saveDestination(null, fd({ ...placeBase, altitudeM: "900", hostName: "Ignored", difficulty: "HARD" }))); d = writes.find((w) => w.op === "destination.create")?.args.data; t("PLACE: only the altitude is kept — a person or difficulty can't be attached to a place", !!d && !("hostName" in d) && !("difficulty" in d));

  // ===== the forms show the fields with the saved values =====
  const forms: [string, string, any][] = [["admin experience", "@/components/admin/ExperienceForm", { experience: { id: "x", name: "n", category: "ADVENTURE", region: "r", description: "d", image: "i", altitudeM: 1420, difficulty: "HARD", elevationGainM: 350, hostName: "Hosea Mwamburi", hostRole: "Guide", hostQuote: "Hi", status: "DRAFT", featured: false } }], ["partner experience", "@/components/partners/PartnerExperienceForm", { experience: { id: "x", name: "n", category: "ADVENTURE", region: "r", description: "d", image: "i", altitudeM: 1420, difficulty: "HARD", elevationGainM: 350, hostName: "Hosea Mwamburi", hostRole: "Guide", hostQuote: "Hi", featured: false } }]];
  for (const [label, mod, props] of forms) { const Form = (await import(mod)).default as any; const h = renderToStaticMarkup(React.createElement(Form, props)); t(`FORM (${label}): the Field guide section is there with the saved values, difficulty preselected, and every input has a label`, /Field guide \(optional\)/.test(h) && /name="altitudeM"[^>]*value="1420"/.test(h) && /<option value="HARD" selected/.test(h) && /name="elevationGainM"[^>]*value="350"/.test(h) && /name="hostName"[^>]*value="Hosea Mwamburi"/.test(h) && !/name="moods"/.test(h)); }
  const stayProps = (extra: any) => ({ accommodation: { id: "a", name: "n", type: "HOMESTAY", region: "r", description: "d", image: "i", altitudeM: 1500, hostName: "Mama Njeri", hostRole: "Host", hostQuote: null, moods: ["quiet", "market"], amenities: [], featured: false, status: "DRAFT", ...extra } });
  for (const [label, mod] of [["admin stay", "@/components/admin/AccommodationForm"], ["partner stay", "@/components/partners/PartnerAccommodationForm"]] as const) { const Form = (await import(mod)).default as any; const h = renderToStaticMarkup(React.createElement(Form, stayProps({}))); t(`FORM (${label}): five mood tick-boxes with the saved ones ticked, host fields, and NO difficulty or climb`, (h.match(/name="moods"/g) ?? []).length === 5 && /<input[^>]*name="moods"[^>]*checked=""[^>]*value="quiet"/.test(h) && /<input[^>]*name="moods"[^>]*checked=""[^>]*value="market"/.test(h) && !/<input[^>]*name="moods"[^>]*checked=""[^>]*value="view"/.test(h) && (h.match(/name="moods"[^>]*checked=/g) ?? []).length === 2 && /name="hostName"[^>]*value="Mama Njeri"/.test(h) && !/name="difficulty"/.test(h) && !/name="elevationGainM"/.test(h)); }
  { const Form = (await import("@/components/admin/DestinationForm")).default as any; const h = renderToStaticMarkup(React.createElement(Form, { destination: { id: "d", name: "n", category: "WILD", region: "r", blurb: "b", image: "i", altitudeM: 1640, status: "DRAFT", featured: false, checkinRadiusM: 300 } })); t("FORM (place): only the altitude is offered (no person, difficulty or moods)", /name="altitudeM"[^>]*value="1640"/.test(h) && !/name="hostName"/.test(h) && !/name="difficulty"/.test(h) && !/name="moods"/.test(h)); }
  const fresh = renderToStaticMarkup(React.createElement((await import("@/components/admin/ExperienceForm")).default as any, {})); t("FORM (new listing): the section is present and empty, with the consent reminder", /name="altitudeM"[^>]*value=""/.test(fresh) && /Only name someone who has agreed to be named/.test(fresh));

  { const h1 = renderToStaticMarkup(React.createElement((await import("@/components/admin/ExperienceForm")).default as any, { experience: { id: "x", name: "n", category: "ADVENTURE", region: "r", description: "d", image: "i", latitude: -3.39833, longitude: 38.36028, status: "DRAFT", featured: false } })); const h2 = renderToStaticMarkup(React.createElement((await import("@/components/admin/AccommodationForm")).default as any, { accommodation: { id: "a", name: "n", type: "HOMESTAY", region: "r", description: "d", image: "i", latitude: -3.37, longitude: 38.37, moods: [], amenities: [], status: "DRAFT", featured: false } })); const h3 = renderToStaticMarkup(React.createElement((await import("@/components/admin/DestinationForm")).default as any, { destination: { id: "d", name: "n", category: "WILD", region: "r", blurb: "b", image: "i", altitudeM: 1, latitude: -3.4, longitude: 38.3, status: "DRAFT", featured: false, checkinRadiusM: 300 } }));
    const inp = (h: string, n: string) => (h.match(new RegExp(`<input[^>]*name="${n}"[^>]*>`)) ?? [""])[0]; const at = (tag: string, a: string) => new RegExp(`\\b${a}="([^"]*)"`).exec(tag)?.[1]; // attributes are read by name, in any order
    t("FORM: experience and stay forms have number boxes for latitude and longitude (limits set, saved values shown, copy-from-Google-Maps help); the place form keeps its own single pair", at(inp(h1, "latitude"), "min") === "-4.7" && at(inp(h1, "latitude"), "max") === "5.1" && at(inp(h1, "latitude"), "value") === "-3.39833" && at(inp(h1, "longitude"), "value") === "38.36028" && at(inp(h2, "latitude"), "value") === "-3.37" && /Latitude comes first/.test(h1) && (h3.match(/name="latitude"/g) ?? []).length === 1); }
  // ===== the drawn ribbon =====
  const F_ = await import("@/lib/field-guide"); const Ribbon = (await import("@/components/field/AltitudeRibbon")).default as any; const mk = (m: number, extra: any = {}) => renderToStaticMarkup(React.createElement(Ribbon, { altitudeM: m, ...extra }));
  const rb = mk(1350); t("RIBBON: the marker sits at the right place on the line (1,350 m is half way along: x = 320), and the height is written beside it as real page text (so it stays readable on a phone, not shrunk inside the drawing)", /<circle cx="320"/.test(rb) && /data-ribbon-label[^>]*>1,350 m<\/span>/.test(rb) && !/<text/.test(rb) && /left:50%/.test(rb));
  t("RIBBON: a screen reader hears where it sits ('1,350 m, in the foothills') and the scale once; the drawing and the visible words are hidden from it so nothing is read twice", /role="img"[^>]*aria-label="Sits at 1,350 m, in the foothills\./.test(rb) && /400 m on the plains to 2,300 m/.test(rb) && /<svg[^>]*aria-hidden="true"/.test(rb) && /<span aria-hidden="true" data-ribbon-label/.test(rb));
  t("RIBBON: names are included when given; the three zone labels show unless switched off", /Wundanyi sits at 1,350 m/.test(mk(1350, { name: "Wundanyi" })) && /Wundanyi · 1,350 m/.test(mk(1350, { name: "Wundanyi" })) && />Plains</.test(rb) && />Highlands</.test(rb) && !/>Plains</.test(mk(1350, { showZones: false })));
  t("RIBBON: the label sits centred above the marker (on the light page, clear of the dark fill); near the plains end it leans right, near the top end it leans left — so it always stays inside the picture", /translate\(-50%, calc\(-100% - 12px\)\)/.test(rb) && /<circle cx="0"/.test(mk(100)) && /translate\(-6px, calc/.test(mk(100)) && /<circle cx="640"/.test(mk(9000)) && /translate\(calc\(-100% \+ 6px\)/.test(mk(9000)) && /left:100%/.test(mk(9000)) && /translate\(-50%/.test(mk(1000)));
  t("RIBBON: each zone word sits in the middle of its OWN zone (Plains 13.16%, Foothills 39.47%, Highlands 76.32%), with faint boundary lines at the real cut-offs (900 m and 1,400 m), so a place at 1,420 m falls inside Highlands rather than above 'Foothills'", /left:13\.16%/.test(rb) && /left:39\.47%/.test(rb) && /left:76\.32%/.test(rb) && (rb.match(/stroke-dasharray="2 4"/g) ?? []).length === 1 && /<line x1="168\.42/.test(rb) && /<line x1="336\.84/.test(rb) && F_.altitudeZone(1420) === "HIGHLANDS" && F_.ribbonPosition(1420) >= F_.ribbonPosition(F_.ZONE_BOUNDS.highlandsFrom) && F_.ribbonPosition(1399) < F_.ribbonPosition(F_.ZONE_BOUNDS.highlandsFrom));
    const Chips = (await import("@/components/field/DateChips")).default as any; t("DATE CHIPS: nothing at all when there are no dates (no empty list)", renderToStaticMarkup(React.createElement(Chips, { chips: [] })) === "");
  const Person = (await import("@/components/field/PersonChip")).default as any; const ph = renderToStaticMarkup(React.createElement(Person, { name: "grace wanjiru mghanga", role: "Cook", verb: "Hosted by" })); t("PERSON: initials from first and last name, the verb and name, and the role below; the initials are hidden from screen readers (the name is read once)", /aria-hidden="true"[^>]*>GM</.test(ph) && /Hosted by <b[^>]*>grace wanjiru mghanga<\/b>/.test(ph) && />Cook</.test(ph));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} FIELD GUIDE FORM AND KIT CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
