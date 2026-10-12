import { parseCoordinates, parseGuideFields } from "@/lib/field-guide";

// Makers: the people and groups behind what is sold. Pure functions: no database.
// The rule that matters most: nothing about a maker is shown publicly until their consent is recorded.

/** The database filter for every public view of makers. Consent is required on its own, whatever the status says. */
export const PUBLIC_MAKER = { status: "PUBLISHED", consentGivenAt: { not: null } } as const;
export const isPublicMaker = (m: { status: string; consentGivenAt: Date | null | undefined }): boolean => m.status === "PUBLISHED" && !!m.consentGivenAt;

// ---- How a product was made -------------------------------------------------------------------------------------------------------
const MAX_STEPS = 8, MAX_STEP_CHARS = 500;
/** Steps are written as paragraphs separated by a blank line: the material, the making, the finishing. */
export function parseHowMade(text: string | null | undefined): string[] {
  return String(text ?? "").replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim().slice(0, MAX_STEP_CHARS)).filter(Boolean).slice(0, MAX_STEPS);
}
/** "About 14 hours", "About 1 hour", "About 3 days" (from two days up). Null for anything that isn't a sensible number of hours. */
export function hoursLabel(h: unknown): string | null {
  if (!Number.isInteger(h) || (h as number) < 1 || (h as number) > 2000) return null;
  const n = h as number; if (n >= 48) { const d = Math.round(n / 24); return `About ${d} days`; }
  return `About ${n} ${n === 1 ? "hour" : "hours"}`;
}

// ---- Entering the facts (admin form) ----------------------------------------------------------------------------------------------
type FormLike = { get(name: string): unknown; getAll(name: string): unknown[] };
const one = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max) : "");
const para = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "");
const id = (v: unknown): string | null => { const s = one(v, 80); return s ? (s.length <= 64 ? s : null) : null; };

export type ProvenanceValues = { makerId: string | null; madeInHours: number | null; material: string | null; howMade: string | null };
export function parseProvenance(form: FormLike): { ok: true; values: ProvenanceValues } | { ok: false; error: string } {
  const hRaw = one(form.get("madeInHours"), 12); let hours: number | null = null;
  if (hRaw !== "") { if (!/^\d{1,4}$/.test(hRaw) || Number(hRaw) < 1 || Number(hRaw) > 2000) return { ok: false, error: `Hours must be a whole number from 1 to 2,000 (or left empty). You entered "${hRaw}".` }; hours = Number(hRaw); }
  const rawId = one(form.get("makerId"), 80); if (rawId.length > 64) return { ok: false, error: "That maker can't be chosen." };
  return { ok: true, values: { makerId: id(form.get("makerId")), madeInHours: hours, material: one(form.get("material"), 120) || null, howMade: para(form.get("howMade"), 2000) || null } };
}

export type MakerValues = { name: string; isGroup: boolean; craft: string; village: string; story: string; quote: string | null; image: string | null; latitude: number | null; longitude: number | null; altitudeM: number | null; consent: boolean; status: "DRAFT" | "PUBLISHED"; featured: boolean; experienceId: string | null };
export function parseMaker(form: FormLike): { ok: true; values: MakerValues } | { ok: false; error: string } {
  const name = one(form.get("name"), 80), craft = one(form.get("craft"), 80), village = one(form.get("village"), 80), story = para(form.get("story"), 2000), quote = one(form.get("quote"), 240);
  if (name.length < 2) return { ok: false, error: "Give the maker a name of at least 2 letters." };
  if (craft.length < 2) return { ok: false, error: "Say what they make (for example, sisal basket weaving)." };
  if (village.length < 2) return { ok: false, error: "Say where they work (a village or town)." };
  if (story.length < 20) return { ok: false, error: "Add their story: at least a couple of sentences." };
  const geo = parseCoordinates(form.get("latitude"), form.get("longitude")); if (!geo.ok) return geo;
  const alt = parseGuideFields(form, "place"); if (!alt.ok) return alt;
  const status = one(form.get("status"), 12); if (status !== "DRAFT" && status !== "PUBLISHED") return { ok: false, error: "Status must be draft or published." };
  const image = one(form.get("image"), 500) || null;
  return { ok: true, values: { name, isGroup: form.get("isGroup") === "on", craft, village, story, quote: quote || null, image, latitude: geo.latitude, longitude: geo.longitude, altitudeM: alt.values.altitudeM, consent: form.get("consent") === "on", status, featured: form.get("featured") === "on", experienceId: id(form.get("experienceId")) } };
}
