// What a product (or any) image field may hold: an http(s) URL, or a path to an image that ships with the site (/merch/shirt.jpg).
// Stricter than the old "any URL" check, which also accepted javascript: and data: URLs.

const IMAGE_EXT = /\.(?:jpe?g|png|webp|avif)$/i;
const SAFE_PATH = /^\/[A-Za-z0-9._~\-/]+$/;

export function isImageRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 500) return false;
  if (v.startsWith("/")) return !v.startsWith("//") && !v.includes("..") && SAFE_PATH.test(v) && IMAGE_EXT.test(v);
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export const IMAGE_REF_MESSAGE = "Enter an image URL (https://…) or a site image path such as /merch/shirt.jpg.";
