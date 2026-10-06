import { MAX_UPLOAD_BYTES, POLICIES, type Purpose } from "@/lib/uploads/policy";

export type Processed = { buffer: Buffer; width: number; height: number; contentType: "image/webp" };
export type ProcessResult = { ok: true; image: Processed } | { ok: false; error: string; status: 400 | 413 | 422 | 503 };

const fail = (error: string, status: 400 | 413 | 422 | 503): ProcessResult => ({ ok: false, error, status });

const FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * What kind of file this is, from sharp's metadata. sharp reports BOTH AVIF and iPhone HEIC as "heif" (the container): AVIF is
 * AV1-compressed and readable; HEIC is HEVC-compressed and the prebuilt library can't decode it, so it gets its own message.
 */
export function classifyFormat(meta: { format?: string; compression?: string }): "ok" | "heic" | "unsupported" {
  if (meta.format && FORMATS.has(meta.format)) return "ok";
  if (meta.format === "heif") return meta.compression === "av1" ? "ok" : "heic";
  return "unsupported";
}
/** About 7,000 × 7,000. Anything larger is refused BEFORE it is decoded, so a tiny file can't expand into gigabytes of memory. */
const LIMIT_PIXELS = 50_000_000;

/**
 * Turns whatever was uploaded into the one picture we store.
 *  - It must really decode as a JPEG, PNG, WebP or AVIF — the file name and Content-Type are never believed.
 *  - It is re-encoded, so anything hidden in it (a script tacked onto a JPEG, odd metadata) does not survive.
 *  - It is turned upright, then ALL metadata is removed — including the GPS location phone cameras embed.
 *  - Too-small pictures are refused (a blurry upload never gets in); big ones are scaled down, never up.
 *  - It is saved as high-quality WebP.
 */
export async function processImage(input: Buffer, purpose: Purpose): Promise<ProcessResult> {
  const p = POLICIES[purpose];
  if (!input || input.length === 0) return fail("No picture was received.", 400);
  if (input.length > MAX_UPLOAD_BYTES) return fail(`That picture is ${(input.length / 1e6).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1e6} MB — try a smaller one.`, 413);

  let sharp: any;
  try {
    // @ts-ignore — sharp ships its own types once installed (npm install sharp)
    sharp = (await import("sharp")).default;
  } catch {
    return fail("Image processing isn't available on this server (sharp isn't installed).", 503);
  }

  try {
    const open = () => sharp(input, { limitInputPixels: LIMIT_PIXELS, failOn: "error" });
    const meta = await open().metadata();
    const kind = classifyFormat(meta);
    if (kind === "heic") return fail("That's an iPhone HEIC photo, which we can't read. On your iPhone choose Settings → Camera → Formats → Most Compatible, or share the photo as a JPEG, and try again.", 422);
    if (kind !== "ok") return fail("Please upload a JPEG, PNG or WebP picture.", 422);
    if ((meta.pages ?? 1) > 1) return fail("Animated pictures aren't supported — please upload a still image.", 422);

    const upright = (meta.orientation ?? 1) >= 5; // phone photos are often stored sideways with a rotate flag
    const w: number = upright ? meta.height : meta.width;
    const h: number = upright ? meta.width : meta.height;
    if (!w || !h) return fail("That file isn't a picture we can read.", 422);
    if (w < p.minWidth || h < p.minHeight) {
      return fail(`That ${p.label} is only ${w}×${h} px. Please upload one at least ${p.minWidth}×${p.minHeight} px so it stays sharp.`, 422);
    }

    let img = open().rotate(); // auto-orient from the camera's flag
    if (!p.keepAlpha) img = img.flatten({ background: "#ffffff" });
    if (p.fit === "cover") {
      const side = Math.min(p.maxEdge, w, h); // a square, never upscaled
      img = img.resize(side, side, { fit: "cover", position: "attention" });
    } else {
      img = img.resize(p.maxEdge, p.maxEdge, { fit: "inside", withoutEnlargement: true });
    }

    // sharp removes all metadata (EXIF, GPS, XMP) unless told to keep it. We never tell it to.
    let out = await img.webp({ quality: p.quality, alphaQuality: 100, effort: 4, smartSubsample: true }).toBuffer({ resolveWithObject: true });
    if (out.data.length > MAX_UPLOAD_BYTES) out = await open().rotate().resize(p.maxEdge, p.maxEdge, { fit: "inside", withoutEnlargement: true }).webp({ quality: 70 }).toBuffer({ resolveWithObject: true });
    return { ok: true, image: { buffer: out.data, width: out.info.width, height: out.info.height, contentType: "image/webp" } };
  } catch (err) {
    if (/pixel limit/i.test(String((err as Error)?.message))) return fail("That picture is enormous (over 50 megapixels). Please reduce its size first.", 422);
    return fail("That file isn't a picture we can read — please try a JPEG or PNG.", 422);
  }
}
