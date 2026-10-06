// What may be uploaded, by whom, and how every picture is treated. One place, so the form, the API and the tests agree.

export type Purpose = "photo" | "product" | "logo" | "avatar" | "note";

export type Policy = {
  label: string;
  /** The longest side we keep. Bigger pictures are scaled down (never up). */
  maxEdge: number;
  /** Pictures smaller than this are REFUSED — a blurry upload never gets in. */
  minWidth: number;
  minHeight: number;
  /** "cover" crops to a square of `maxEdge`; "inside" keeps the whole picture. */
  fit: "inside" | "cover";
  /** Keep transparency (logos). Photos with transparency are put on white. */
  keepAlpha: boolean;
  /** WebP quality. 86 is visually indistinguishable from the original at a fraction of the size. */
  quality: number;
};

export const POLICIES: Record<Purpose, Policy> = {
  photo: { label: "photo", maxEdge: 2400, minWidth: 1200, minHeight: 600, fit: "inside", keepAlpha: false, quality: 86 },
  product: { label: "product photo", maxEdge: 2000, minWidth: 800, minHeight: 500, fit: "inside", keepAlpha: false, quality: 86 },
  logo: { label: "logo", maxEdge: 1200, minWidth: 200, minHeight: 60, fit: "inside", keepAlpha: true, quality: 92 },
  avatar: { label: "profile photo", maxEdge: 800, minWidth: 400, minHeight: 400, fit: "cover", keepAlpha: false, quality: 86 },
  note: { label: "photo", maxEdge: 2000, minWidth: 800, minHeight: 500, fit: "inside", keepAlpha: false, quality: 86 },
};

/** The most the server will accept. Below the 4.5 MB request limit of Vercel Functions and the 6 MB of Netlify Functions. */
export const MAX_UPLOAD_BYTES = 4_000_000;

/** Pictures larger than this are scaled down in the BROWSER before upload (phone photos are 5–12 MB). */
export const CLIENT_RESIZE_ABOVE_BYTES = 3_500_000;

export const isPurpose = (v: unknown): v is Purpose => typeof v === "string" && Object.prototype.hasOwnProperty.call(POLICIES, v);

const STAFF = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
const ALLOWED: Record<string, Purpose[]> = {
  PARTNER: ["photo", "logo"], // hosts: their stay or experience photos, and a logo
  SELLER: ["product"], // shop sellers: product photos
  CREATOR: ["note", "avatar"], // Field Crew: photos for their Field Notes, and their own picture
};

/** Staff may upload anything; everyone else only what their role needs. A plain member (or a signed-out visitor) can't upload. */
export function canUpload(role: string, purpose: Purpose): boolean {
  if (STAFF.includes(role)) return true;
  return (ALLOWED[role] ?? []).includes(purpose);
}

/** Uploads per hour. Staff upload in bulk; everyone else a handful. */
export const uploadsPerHour = (role: string) => (STAFF.includes(role) ? 200 : 40);

/** The only shape a storage key can have — which also means a key can never be a path to somewhere else. */
export const KEY_PATTERN = /^images\/(photo|product|logo|avatar|note)\/\d{6}\/[0-9a-f]{24}\.webp$/;
