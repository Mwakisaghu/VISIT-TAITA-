// A read-only check of what is in the database, for launch: pictures that are not yours, logos that are web pages, placeholders and sample items still showing.
// The picture rules come from lib/image-hosts.json, the same file the site uses, so the audit and the admin forms can never disagree.
import fs from "node:fs";

const HOSTS = JSON.parse(fs.readFileSync(new URL("../../lib/image-hosts.json", import.meta.url), "utf8"));
const FILE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const hostOf = (raw) => { try { const u = new URL(String(raw).trim()); return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase() : null; } catch { return null; } };
const under = (host, list) => list.some((h) => host === h || host.endsWith("." + h));

/** What is wrong with a stored picture address, in the same terms as the site's own rules (lib/image-policy.ts). */
export function classifyImage(raw, kind = "photo") {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v.startsWith(HOSTS.ownPlaceholderPath) && /^\/placeholders\/[a-z0-9-]+\.svg$/.test(v)) return kind === "logo" ? { code: "placeholder", text: "is the 'picture coming soon' placeholder, not a logo" } : { code: "own-placeholder", text: "still shows the 'picture coming soon' placeholder" };
  if (v.startsWith("/") && !v.startsWith("//") && /^\/[A-Za-z0-9._\-\/]+$/.test(v) && FILE.test(v)) return null; // one of the site's own files
  const host = hostOf(v); if (!host) return { code: "not-a-url", text: "has no usable picture address" };
  const blocked = Object.entries(HOSTS.blocked).find(([h]) => host === h || host.endsWith("." + h)); if (blocked) return { code: "blocked", text: `uses a picture hosted by ${blocked[1]} (not yours to reuse)` };
  if (under(host, HOSTS.placeholders)) return { code: "placeholder", text: "uses a placeholder picture" };
  const stock = under(host, HOSTS.stock);
  if (kind === "logo") { let path = ""; try { path = new URL(v).pathname; } catch { /* */ } if (!FILE.test(path)) return { code: "not-a-picture", text: "has a web page address as its logo (it shows as a broken image)" }; if (stock) return { code: "not-a-picture", text: "uses a stock photo as its logo" }; }
  return stock ? { code: "stock", text: "uses a stock photo (not a picture of Taita)" } : null;
}
const FAKE_PHONE = /(?:\+?254|0)?7(?:\d)?(?:12345|00000|11111|22222|99999)\d{0,4}\b|12345\d{3}/;
const FAKE_EMAIL = /@[^@\s]*\.(example|test|invalid|localhost)$|@example\.(com|org|net)$/i;
const LABEL = { story: "story", place: "place", stay: "stay", experience: "experience", product: "product", sponsor: "sponsor", maker: "maker" };

/** rows: { kind, name, image?, logo?, status, isDemo?, contactPhone?, contactEmail? } */
export function auditRows(rows) {
  const issues = []; const counts = {}; const byImage = new Map();
  const add = (severity, r, message) => issues.push({ severity, kind: r.kind, name: r.name, message });
  for (const r of rows) {
    const c = (counts[r.kind] ??= { total: 0, published: 0, sample: 0, needsPhoto: 0 }); c.total++; const live = r.status === "PUBLISHED"; if (live) c.published++; if (r.isDemo) c.sample++;
    const isLogo = r.kind === "sponsor"; const pic = isLogo ? r.logo : r.image; const k = classifyImage(pic, isLogo ? "logo" : "photo");
    if (k) {
      if (k.code === "own-placeholder") { c.needsPhoto++; if (live) add("fix", r, `${k.text}: add a real photograph`); }
      else if (k.code === "stock") { c.needsPhoto++; if (live) add("fix", r, `${k.text}: replace it with a real photograph`); }
      else add(live ? "blocker" : "fix", r, `${k.text}${live ? " and it is published" : ""}`);
    }
    if (pic && !isLogo && live) { const key = String(pic).trim(); if (!byImage.has(key)) byImage.set(key, []); byImage.get(key).push(r); }
    if (live && !r.isDemo) {
      if (r.contactPhone && FAKE_PHONE.test(String(r.contactPhone).replace(/[\s()-]/g, ""))) add("blocker", r, `shows a phone number that looks like a placeholder (${r.contactPhone}); it could ring a stranger`);
      if (r.contactEmail && FAKE_EMAIL.test(String(r.contactEmail))) add("blocker", r, `shows a placeholder email (${r.contactEmail})`);
    }
    if (live && r.isDemo) add("note", r, "is a SAMPLE and shows a 'sample content' notice to visitors");
  }
  const dups = [];
  for (const [pic, list] of byImage) { const names = [...new Set(list.map((x) => `${LABEL[x.kind]} "${x.name}"`))]; if (names.length > 1 && !pic.startsWith(HOSTS.ownPlaceholderPath)) { dups.push({ picture: pic, items: names }); for (const x of list) add("fix", x, `shares its picture with ${names.length - 1} other item(s)`); } }
  const rank = { blocker: 0, fix: 1, note: 2 }; issues.sort((a, b) => rank[a.severity] - rank[b.severity] || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  return { issues, counts, duplicates: dups, blockers: issues.filter((i) => i.severity === "blocker").length, fixes: issues.filter((i) => i.severity === "fix").length, notes: issues.filter((i) => i.severity === "note").length };
}

export function formatReport(r) {
  const out = []; const head = { blocker: "MUST FIX BEFORE LAUNCH", fix: "SHOULD FIX", note: "FOR YOUR INFORMATION" };
  for (const sev of ["blocker", "fix", "note"]) { const list = r.issues.filter((i) => i.severity === sev); if (!list.length) continue; out.push(`\n${head[sev]} (${list.length})`); for (const i of list) out.push(`  - ${LABEL[i.kind]} "${i.name}" ${i.message}`); }
  out.push("\nWHAT IS IN THE DATABASE"); for (const [k, c] of Object.entries(r.counts)) out.push(`  ${LABEL[k].padEnd(11)} ${String(c.total).padStart(3)} in all, ${String(c.published).padStart(3)} published, ${String(c.sample).padStart(3)} sample, ${String(c.needsPhoto).padStart(3)} still need a real photograph`);
  out.push(r.blockers === 0 ? "\nNo blockers. " + (r.fixes ? `${r.fixes} thing(s) are still worth fixing.` : "") : `\n${r.blockers} blocker(s): fix these before the site goes public.`);
  return out.join("\n");
}

/** Reads what the audit needs. `prisma` is passed in so this can be tested without a database. */
export async function loadRows(prisma) {
  const pick = (kind, rows, f) => rows.map((x) => ({ kind, ...f(x) }));
  const [stories, places, stays, exps, products, sponsors, makers] = await Promise.all([
    prisma.story.findMany({ select: { title: true, image: true, status: true, isDemo: true } }), prisma.destination.findMany({ select: { name: true, image: true, status: true, isDemo: true } }),
    prisma.accommodation.findMany({ select: { name: true, image: true, status: true, isDemo: true, contactPhone: true, contactEmail: true } }), prisma.experience.findMany({ select: { name: true, image: true, status: true, isDemo: true, contactPhone: true, contactEmail: true } }),
    prisma.product.findMany({ select: { name: true, image: true, status: true, isDemo: true } }), prisma.sponsor.findMany({ select: { name: true, logo: true, status: true, isDemo: true } }), prisma.maker.findMany({ select: { name: true, image: true, status: true } }),
  ]);
  return [...pick("story", stories, (x) => ({ name: x.title, image: x.image, status: x.status, isDemo: x.isDemo })), ...pick("place", places, (x) => ({ name: x.name, image: x.image, status: x.status, isDemo: x.isDemo })),
    ...pick("stay", stays, (x) => ({ name: x.name, image: x.image, status: x.status, isDemo: x.isDemo, contactPhone: x.contactPhone, contactEmail: x.contactEmail })), ...pick("experience", exps, (x) => ({ name: x.name, image: x.image, status: x.status, isDemo: x.isDemo, contactPhone: x.contactPhone, contactEmail: x.contactEmail })),
    ...pick("product", products, (x) => ({ name: x.name, image: x.image, status: x.status, isDemo: x.isDemo })), ...pick("sponsor", sponsors, (x) => ({ name: x.name, logo: x.logo, status: x.status, isDemo: x.isDemo })), ...pick("maker", makers, (x) => ({ name: x.name, image: x.image, status: x.status }))];
}

/** The one repair offered: take published sponsors whose logo is not a usable picture off the public page (they become drafts; nothing is deleted). */
export async function hideBadSponsors(prisma, apply) {
  const sponsors = await prisma.sponsor.findMany({ where: { status: "PUBLISHED" }, select: { id: true, name: true, logo: true } });
  const bad = sponsors.filter((s) => classifyImage(s.logo, "logo") !== null);
  if (apply) for (const s of bad) await prisma.sponsor.update({ where: { id: s.id }, data: { status: "DRAFT" } });
  return bad.map((s) => ({ id: s.id, name: s.name, reason: classifyImage(s.logo, "logo").text }));
}
