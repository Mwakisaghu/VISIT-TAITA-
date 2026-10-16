import fs from "fs";
async function main() {
  const R = await import("@/lib/passport-book"); const { ZONE_BOUNDS } = await import("@/lib/field-guide");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const P = (id: string, alt: number | null, o: Partial<R.PassportPlace> = {}): R.PassportPlace => ({ id, slug: id, name: id.toUpperCase(), region: "R", category: "WILD", altitudeM: alt, state: "open", method: null, visitedAt: null, canLocate: true, radiusM: 300, wanted: false, ...o });
  t("ZONES use the Field Guide's own cut-offs: below 900 m plains, 900 to 1,399 foothills, 1,400 and above highlands", R.zoneOf(0) === "plains" && R.zoneOf(ZONE_BOUNDS.foothillsFrom - 1) === "plains" && R.zoneOf(ZONE_BOUNDS.foothillsFrom) === "foothills" && R.zoneOf(ZONE_BOUNDS.highlandsFrom - 1) === "foothills" && R.zoneOf(ZONE_BOUNDS.highlandsFrom) === "highlands" && R.zoneOf(2300) === "highlands");
  t("A PLACE WITH NO HEIGHT is never guessed into a zone: missing, not-a-number and undefined all go to 'elsewhere'", R.zoneOf(null) === "elsewhere" && R.zoneOf(undefined) === "elsewhere" && R.zoneOf(NaN) === "elsewhere");
  t("STAMP STATE from how a visit was made: QR and location are stamps; 'I've been here' is marked (no points); no visit is open; anything unexpected is open, never a stamp", R.stateOf("QR") === "stamped" && R.stateOf("LOCATION") === "stamped" && R.stateOf("SELF_REPORTED") === "marked" && R.stateOf(null) === "open" && R.stateOf(undefined) === "open" && R.stateOf("qr") === "open" && R.stateOf("ADMIN") === "open");
  // pagination
  const many = [...Array(8)].map((_, i) => P("p" + i, 500 + i * 10)).concat([P("f1", 1000), P("h1", 1700), P("h2", 1500), P("x1", null), P("x0", null)]);
  const zp = R.zonePages(many);
  t("STAMP PAGES: six to a page; 8 plains places make two pages (6 then 2); each zone's pages say 'part of' correctly; zones come in order plains, foothills, highlands, elsewhere", zp.map((p) => `${p.zone}${p.part}/${p.of}:${p.places.length}`).join(" ") === "plains1/2:6 plains2/2:2 foothills1/1:1 highlands1/1:2 elsewhere1/1:2");
  t("WITHIN A ZONE the places run in the order you climb them (lowest first), ties by name; 'elsewhere' by name", zp[2 + 0].places[0].id === "f1" && zp[3].places.map((p) => p.id).join() === "h2,h1" && zp[4].places.map((p) => p.id).join() === "x0,x1" && zp[0].places.map((p) => p.id).join() === "p0,p1,p2,p3,p4,p5");
  t("A ZONE WITH NOTHING IN IT HAS NO PAGE (no empty 'Highlands' page when none are published)", R.zonePages([P("a", 600)]).length === 1 && R.zonePages([]).length === 0);
  t("NO PLACE IS LOST OR REPEATED across the pages", zp.flatMap((p) => p.places.map((x) => x.id)).sort().join() === many.map((x) => x.id).sort().join());
  t("THE ORIGINAL ARRAY IS NOT REORDERED by building pages (the data stays as given)", (() => { const a = [P("z", 1700), P("a", 500)]; R.zonePages(a); return a[0].id === "z"; })());
  // sheets and spreads
  const proto = [P("v", 580), P("j", 700), P("m", 1050), P("w", 1250), P("b", 1500)];
  const content = R.contentPages(proto); const keys = (c: R.PageSpec[]) => c.map(R.pageKey).join();
  t("CONTENT: you, each zone's pages, endorsements, rewards (6 pages here, after the cover)", keys(content) === "you,zone-plains-1,zone-foothills-1,zone-highlands-1,seals,rewards");
  const sheets = R.sheetsOf(content); const sk = sheets.map(([a, b]) => `${R.pageKey(a)}|${b ? R.pageKey(b) : "-"}`).join("  ");
  t("SHEETS: the cover has the first page on its back; later sheets carry two pages; the LAST sheet carries one, so the final spread is never left with a missing partner", sk === "cover|you  zone-plains-1|zone-foothills-1  zone-highlands-1|seals  rewards|-");
  const sp = R.spreadsOf(sheets).map((s) => s.map(R.pageKey).join("+")).join("  ");
  t("SPREADS: the cover alone, then 'you + plains', 'foothills + highlands', 'endorsements + rewards': every page appears exactly once", sp === "cover  you+zone-plains-1  zone-foothills-1+zone-highlands-1  seals+rewards");
  for (const n of [0, 1, 2, 3, 5, 6, 7, 12, 13, 20]) {
    const pl = [...Array(n)].map((_, i) => P("q" + i, 500 + (i % 3) * 600 + i)); const c = R.contentPages(pl); const sh = R.sheetsOf(c); const spr = R.spreadsOf(sh); const flat = spr.flat().map(R.pageKey);
    const ok = sh[sh.length - 1][1] === null && new Set(flat).size === flat.length && flat.length === c.length + 1 && (c.length - 1) % 2 === 1 && pl.every((p) => c.some((pg) => pg.kind === "zone" && pg.places.some((x) => x.id === p.id)));
    t(`WITH ${n} PLACES the booklet is well-formed: the last sheet is single, no page is repeated or missing, every place has a slot`, ok);
  }
  t("THE CLOSING PAGE appears only when needed to keep pairs even (here, with 0 places: you, endorsements, rewards would leave one over)", R.contentPages([]).map((p) => p.kind).join() === "you,seals,rewards,end" && R.contentPages(proto).every((p) => p.kind !== "end"));
  // tally
  const tl = R.tally([P("a", 1, { state: "stamped" }), P("b", 1, { state: "stamped" }), P("c", 1, { state: "marked" }), P("d", 1)]);
  t("THE TALLY counts stamps, marked and open places separately; the total is all of them", tl.stamped === 2 && tl.marked === 1 && tl.open === 1 && tl.total === 4);
  // text
  const iso = "2026-10-12T21:30:00Z"; // 13 October 00:30 in Nairobi: the date must be Nairobi's, not UTC's
  t("DATES ARE NAIROBI'S, NOT UTC'S: 21:30 UTC on 12 October is already 13 October in Taita, on a stamp and in text", R.bandDate(iso, "en") === "13 OCT 26" && R.shortDate(iso, "en") === "13 Oct 2026" && R.longDate(iso, "en") === "13 October 2026");
  const lg = (l: any) => R.longDate("2026-10-17T08:00:00Z", l);
  t("DATES FOLLOW THE LANGUAGE: Kiswahili, French and German write the month in their own words", /Oktoba/i.test(lg("sw")) && /octobre/.test(lg("fr")) && /Oktober/.test(lg("de")) && /October/.test(lg("en")));
  t("A STAMP'S DATE BAND is short, upper-case and has no full stops in any language (it must fit a small band)", ["en", "sw", "fr", "de"].every((l: any) => { const b = R.bandDate("2026-10-03T08:00:00Z", l); return /^\d{1,2} [A-ZÄÖÜÉ]{3,5} 26$/.test(b) && !b.includes("."); }));
  t("HEIGHTS use the language's own digit grouping and always end in ' m' with a plain space", R.metres(1250, "en") === "1,250 m" && /^1\s?250 m$/.test(R.metres(1250, "fr")) && /1\.250 m|1250 m/.test(R.metres(1250, "de")) && R.metres(580, "sw") === "580 m" && !/[\u00A0\u202F]/.test(R.metres(1250, "fr")));
  t("THE FILE IS PURE: no database, no framework, no browser", !/prisma|next\/|react|window\.|document\./.test(fs.readFileSync("lib/passport-book.ts", "utf8").replace(/\/\/.*$/gm, "")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PASSPORT BOOK RULE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
