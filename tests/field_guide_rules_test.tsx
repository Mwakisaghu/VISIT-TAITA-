async function main() {
  const F = await import("@/lib/field-guide"); const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  // ===== altitude =====
  t("ZONES: below 900 m is Plains, 900–1,399 Foothills, 1,400 and up Highlands — each boundary exactly", F.altitudeZone(0) === "PLAINS" && F.altitudeZone(899) === "PLAINS" && F.altitudeZone(900) === "FOOTHILLS" && F.altitudeZone(1399) === "FOOTHILLS" && F.altitudeZone(1400) === "HIGHLANDS" && F.altitudeZone(2208) === "HIGHLANDS");
  t("LABELS: '1,420 m', '1,420 m · Highlands', '560 m · Plains' (thousands separated)", F.formatMetres(1420) === "1,420 m" && F.altitudeLabel(1420) === "1,420 m · Highlands" && F.altitudeLabel(560) === "560 m · Plains" && F.formatMetres(1420.4) === "1,420 m");
  t("RIBBON: a marker sits at 0 at or below the plains end, 1 at or above the top, and in proportion between (clamped)", F.ribbonPosition(300) === 0 && F.ribbonPosition(400) === 0 && F.ribbonPosition(2300) === 1 && F.ribbonPosition(9000) === 1 && Math.abs(F.ribbonPosition(1350) - 0.5) < 1e-9);
  t("LEVELS and climb: 'Easy / Moderate / Hard', '+420 m'", F.LEVEL_LABEL.EASY === "Easy" && F.LEVEL_LABEL.HARD === "Hard" && F.climbLabel(420) === "+420 m" && F.climbLabel(1250) === "+1,250 m");
  t("INITIALS: first and last name, capitals; one name; blank; extra spaces", F.initials("Hosea Mwamburi") === "HM" && F.initials("grace wanjiru mghanga") === "GM" && F.initials("Amina") === "A" && F.initials("") === "?" && F.initials("   ") === "?" && F.initials("  jane   doe ") === "JD");

  // ===== date chips =====
  const NOW = new Date("2026-10-08T10:00:00Z"); const at = (iso: string, cap = 10, taken = 4, status = "OPEN") => ({ startsAt: new Date(iso), capacity: cap, seatsTaken: taken, status });
  t("EAT DATES: shown in Nairobi time — 21:30 UTC on Fri 9 Oct is already Sat 10 Oct there", F.eatShort(new Date("2026-10-09T21:30:00Z")) === "Sat 10 Oct" && F.eatShort(new Date("2026-10-09T20:59:00Z")) === "Fri 9 Oct");
  t("SPOTS: capacity minus seats taken, never negative, whole numbers", F.spotsLeft({ capacity: 10, seatsTaken: 4 }) === 6 && F.spotsLeft({ capacity: 5, seatsTaken: 9 }) === 0 && F.spotsLeft({ capacity: 5.9, seatsTaken: 1.2 }) === 4);
  t("CHIP (plenty): 'Sat 10 Oct · 6 spots'", F.sessionChip(at("2026-10-10T06:00:00Z"), NOW)?.label === "Sat 10 Oct · 6 spots" && F.sessionChip(at("2026-10-10T06:00:00Z"), NOW)?.state === "open");
  t("CHIP (few): 2 left -> '2 spots left' and 1 left -> '1 spot left' (singular), state 'few'", F.sessionChip(at("2026-10-10T06:00:00Z", 10, 8), NOW)?.label === "Sat 10 Oct · 2 spots left" && F.sessionChip(at("2026-10-10T06:00:00Z", 10, 9), NOW)?.label === "Sat 10 Oct · 1 spot left" && F.sessionChip(at("2026-10-10T06:00:00Z", 10, 8), NOW)?.state === "few");
  t("CHIP (full): 'Sat 10 Oct · Full', state 'full' — shown so people can see it exists, not hidden", F.sessionChip(at("2026-10-10T06:00:00Z", 10, 10), NOW)?.label === "Sat 10 Oct · Full" && F.sessionChip(at("2026-10-10T06:00:00Z", 10, 10), NOW)?.state === "full");
  t("CHIP: closed and cancelled sessions, and ones that already started, produce no chip", F.sessionChip(at("2026-10-10T06:00:00Z", 10, 4, "CLOSED"), NOW) === null && F.sessionChip(at("2026-10-10T06:00:00Z", 10, 4, "CANCELLED"), NOW) === null && F.sessionChip(at("2026-10-08T09:00:00Z"), NOW) === null && F.sessionChip(at("2026-10-08T10:00:00Z"), NOW) === null);
  const many = [at("2026-10-20T06:00:00Z"), at("2026-10-10T06:00:00Z"), at("2026-10-07T06:00:00Z"), at("2026-10-12T06:00:00Z", 10, 4, "CLOSED"), at("2026-10-15T06:00:00Z"), at("2026-10-11T06:00:00Z")];
  t("NEXT DATES: soonest first, only open future ones, at most 3 (the past one and the closed one are skipped)", F.nextChips(many, NOW).map((c) => c.label).join("|") === "Sat 10 Oct · 6 spots|Sun 11 Oct · 6 spots|Thu 15 Oct · 6 spots" && F.nextChips(many, NOW, 2).length === 2 && F.nextChips([], NOW).length === 0);

  // ===== this weekend =====
  const w = (iso: string) => { const r = F.weekendWindow(new Date(iso)); return `${r.from.toISOString()}→${r.to.toISOString()}`; };
  const SAT = "2026-10-09T21:00:00.000Z→2026-10-11T21:00:00.000Z"; // Sat 10 00:00 EAT to Mon 12 00:00 EAT
  t("WEEKEND: on a Thursday it is the coming Sat–Sun (Nairobi midnight to midnight)", w("2026-10-08T10:00:00Z") === SAT);
  t("WEEKEND: on the Friday it is the coming one; on Saturday and Sunday it is the current one", w("2026-10-09T10:00:00Z") === SAT && w("2026-10-10T08:00:00Z") === SAT && w("2026-10-11T18:00:00Z") === SAT);
  t("WEEKEND: Monday looks to the next one (Sat 17)", w("2026-10-12T05:00:00Z") === "2026-10-16T21:00:00.000Z→2026-10-18T21:00:00.000Z");
  t("WEEKEND, edge: 21:30 UTC on Friday is already Saturday in Nairobi, so it counts as the current weekend", w("2026-10-09T21:30:00Z") === SAT);

  // ===== list filters =====
  const f0 = F.parseExperienceFilters({}); t("FILTERS (none): nothing selected", f0.type === null && f0.level === null && f0.weekend === false);
  const f1 = F.parseExperienceFilters({ type: "Adventure", level: "easy", when: "weekend" }); t("FILTERS: type, level and weekend are read (case-insensitive)", f1.type === "ADVENTURE" && f1.level === "EASY" && f1.weekend === true);
  const f2 = F.parseExperienceFilters({ type: "<script>", level: "impossible", when: "never" }); t("FILTERS: anything unrecognised is ignored (nothing reaches the database)", f2.type === null && f2.level === null && f2.weekend === false);
  t("FILTERS: arrays (a repeated parameter) use the first value", F.parseExperienceFilters({ type: ["food", "culture"] }).type === "FOOD");
  t("LINKS: choosing a type keeps the other filters; choosing the active one turns it off; clearing everything goes to the plain list", F.filterHref(f1, { type: "food" }) === "/experiences?type=food&level=easy&when=weekend" && F.filterHref(f1, { type: "adventure" }) === "/experiences?level=easy&when=weekend" && F.filterHref(f1, { weekend: true }) === "/experiences?type=adventure&level=easy" && F.filterHref(f0, {}) === "/experiences" && F.filterHref(F.parseExperienceFilters({ level: "hard" }), { level: "hard" }) === "/experiences");
  t("LINKS: turning weekend on from nothing", F.filterHref(f0, { weekend: true }) === "/experiences?when=weekend");

  // ===== entering the facts =====
  const form = (o: Record<string, unknown>) => ({ get: (n: string) => o[n] ?? null, getAll: (n: string) => (Array.isArray(o[n]) ? (o[n] as unknown[]) : o[n] == null ? [] : [o[n]]) });
  let r: any = F.parseGuideFields(form({ altitudeM: "1,420", difficulty: "moderate", elevationGainM: "350", hostName: "  Hosea   Mwamburi ", hostRole: "Guide", hostQuote: "I know every stone on this ridge." }), "experience");
  t("FORM (experience): altitude (commas allowed), difficulty, climb and a tidied guide are read", r.ok && r.values.altitudeM === 1420 && r.values.difficulty === "MODERATE" && r.values.elevationGainM === 350 && r.values.hostName === "Hosea Mwamburi" && r.values.hostRole === "Guide" && r.values.hostQuote === "I know every stone on this ridge.");
  r = F.parseGuideFields(form({}), "experience"); t("FORM (experience): everything is optional — an empty form is valid and gives nulls", r.ok && r.values.altitudeM === null && r.values.difficulty === null && r.values.elevationGainM === null && r.values.hostName === null);
  for (const [v, why] of [["abc", "text"], ["-5", "negative"], ["5201", "above Kenya's highest point"], ["12.5", "a fraction"], ["1e3", "scientific notation"], ["0x10", "hexadecimal"], ["1,4,2", "misplaced commas"], ["+5", "a plus sign"], ["1.420", "a European thousands dot"], ["1420 km", "the wrong unit"], ["m", "a unit with no number"]] as any[]) t(`FORM refused: altitude ${why}`, F.parseGuideFields(form({ altitudeM: v }), "experience").ok === false);
  t("FORM: altitude 0 and 5,200 are valid (the limits are inclusive)", (F.parseGuideFields(form({ altitudeM: "0" }), "place") as any).values.altitudeM === 0 && (F.parseGuideFields(form({ altitudeM: "5200" }), "place") as any).values.altitudeM === 5200);
  t("FORM refused: climb out of range, an unknown difficulty", F.parseGuideFields(form({ elevationGainM: "5001" }), "experience").ok === false && F.parseGuideFields(form({ difficulty: "extreme" }), "experience").ok === false);
  r = F.parseGuideFields(form({ hostRole: "Guide", hostQuote: "Hello" }), "experience"); t("FORM: a role or a quote without a name is not saved (nothing can show without a person) — and it is NOT an error, so nobody loses their form", r.ok && r.values.hostName === null && r.values.hostRole === null && r.values.hostQuote === null && (F.parseGuideFields(form({ hostQuote: "Hello" }), "stay") as any).ok === true);
  for (const [v, want] of [["1420", 1420], ["1,420", 1420], ["1 420", 1420], ["1\u00a0420", 1420], ["1420m", 1420], ["1420 m", 1420], ["1,420 metres", 1420], ["1420 M", 1420], ["  1420 masl  ", 1420], ["0 m", 0]] as any[]) t(`FORM accepts how people really write a height: ${JSON.stringify(v)}`, (F.parseGuideFields(form({ altitudeM: v }), "place") as any).values?.altitudeM === want);
  t("FORM: the refusal message says what was entered (and is capped), so the mistake is easy to see", (() => { const e: any = F.parseGuideFields(form({ altitudeM: "high up" }), "place"); const e2: any = F.parseGuideFields(form({ altitudeM: "x".repeat(60) }), "place"); return !e.ok && /You entered "high up"\./.test(e.error) && e2.error.length < 200; })());
  t("FORM refused: a one-letter name", F.parseGuideFields(form({ hostName: "H" }), "experience").ok === false);
  r = F.parseGuideFields(form({ hostName: "A\u0000b\nCde" + "x".repeat(200), hostQuote: "q".repeat(500) }), "experience"); t("FORM: control characters and line breaks become spaces; lengths are cut (name 80, quote 240)", r.ok && !/[\u0000\n]/.test(r.values.hostName) && r.values.hostName.length === 80 && r.values.hostQuote.length === 240);
  r = F.parseGuideFields(form({ altitudeM: "1500", hostName: "Mama Njeri", moods: ["quiet", "view", "view", "bogus", "<b>"] }), "stay"); t("FORM (stay): moods are limited to the known list and de-duplicated; a stay has no difficulty or climb", r.ok && r.values.moods.join() === "quiet,view" && !("difficulty" in r.values) && !("elevationGainM" in r.values) && r.values.hostName === "Mama Njeri");
  r = F.parseGuideFields(form({ altitudeM: "1500", hostName: "Ignored", difficulty: "hard" }), "place"); t("FORM (place): only the altitude is kept", r.ok && r.values.altitudeM === 1500 && !("hostName" in r.values) && !("difficulty" in r.values));
  t("MOODS: five known moods with plain labels", F.MOODS.length === 5 && F.MOODS.map((m) => m.label).join() === "Quiet,With a view,Family-friendly,A hiker's base,Near a market");

  // ===== stay filters =====
  const s0 = F.parseStayFilters({}); t("STAY FILTERS (none): nothing selected", s0.type === null && s0.mood === null && s0.zone === null);
  const s1 = F.parseStayFilters({ type: "Homestay", mood: "Hikers-Base", zone: "highlands" }); t("STAY FILTERS: kind, mood and zone are read (case-insensitive)", s1.type === "HOMESTAY" && s1.mood === "hikers-base" && s1.zone === "HIGHLANDS");
  const s2 = F.parseStayFilters({ type: "castle", mood: "<b>", zone: "moon" }); t("STAY FILTERS: anything unrecognised is ignored (nothing reaches the database)", s2.type === null && s2.mood === null && s2.zone === null);
  t("STAY LINKS: choosing keeps the others, the active one turns itself off, nothing active goes to the plain list", F.stayFilterHref(s1, { mood: "quiet" }) === "/stay?type=homestay&mood=quiet&zone=highlands" && F.stayFilterHref(s1, { mood: "hikers-base" }) === "/stay?type=homestay&zone=highlands" && F.stayFilterHref(s1, { zone: "highlands" }) === "/stay?type=homestay&mood=hikers-base" && F.stayFilterHref(s0, {}) === "/stay" && F.stayFilterHref(F.parseStayFilters({ zone: "plains" }), { zone: "plains" }) === "/stay");
  const zr = (z: any) => JSON.stringify(F.zoneRange(z));
  t("ZONE RANGES: plains below 900, foothills 900 up to (not including) 1,400, highlands from 1,400 — matching the zone rule exactly at every boundary", zr("PLAINS") === '{"lt":900}' && zr("FOOTHILLS") === '{"gte":900,"lt":1400}' && zr("HIGHLANDS") === '{"gte":1400}' && [0, 899, 900, 1399, 1400, 3000].every((m) => { const z = F.altitudeZone(m); const r: any = F.zoneRange(z); return (r.gte === undefined || m >= r.gte) && (r.lt === undefined || m < r.lt); }));

  // ===== coordinates =====
  const pc = (a: any, b: any) => F.parseCoordinates(a, b) as any;
  t("COORDINATES: both empty is fine (no position); only one filled is refused with a plain message", pc("", "").ok && pc("", "").latitude === null && pc("  ", null).longitude === null && !pc("-3.4", "").ok && /both/.test(pc("-3.4", "").error) && !pc("", "38.4").ok);
  t("COORDINATES: Wundanyi's real position is accepted exactly (−3.39833, 38.36028), and plain whole numbers too", pc("-3.39833", "38.36028").latitude === -3.39833 && pc("-3.39833", "38.36028").longitude === 38.36028 && pc("-3", "38").ok && pc(" -3.4 ", " 38.4 ").ok);
  t("COORDINATES: swapped latitude and longitude are caught with a helpful message (the classic mistake)", /look swapped/.test(pc("38.36028", "-3.39833").error) && /look swapped/.test(pc("38.4", "-3.4").error));
  t("COORDINATES: positions outside Kenya are refused (London, the other side of the world)", /outside Kenya/.test(pc("51.5", "-0.12").error) && /outside Kenya/.test(pc("-33.9", "18.4").error) && /outside Kenya/.test(pc("0", "0").error));
  t("COORDINATES: the Kenya limits are inclusive and exact", pc("-4.7", "33.9").ok && pc("5.1", "41.95").ok && !pc("-4.71", "38").ok && !pc("5.11", "38").ok && !pc("-3", "33.89").ok && !pc("-3", "41.96").ok);
  t("COORDINATES: comma decimals, exponents, degrees text and junk are refused, quoting what was typed (capped)", ["-3,398", "1e1", "3°23'S", "abc", "--3", "3.", ".5"].every((v) => !pc(v, "38.4").ok) && /You entered "-3,398"/.test(pc("-3,398", "38.4").error) && pc("x".repeat(60), "38").error.length < 260);
  const gf = (o: any, k: any) => (F.parseGuideFields({ get: (n: string) => o[n] ?? null, getAll: (n: string) => (o[n] == null ? [] : [].concat(o[n])) }, k) as any);
  t("FORM: experiences and stays keep a valid position; empty gives nulls; a bad one refuses the whole save; places never read it here (they have their own fields)", gf({ latitude: "-3.4", longitude: "38.36" }, "experience").values.latitude === -3.4 && gf({ latitude: "-3.4", longitude: "38.36" }, "stay").values.longitude === 38.36 && gf({}, "stay").values.latitude === null && !gf({ latitude: "38.36", longitude: "-3.4" }, "experience").ok && !("latitude" in gf({ latitude: "-3.4", longitude: "38.36" }, "place").values));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} FIELD GUIDE RULE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
