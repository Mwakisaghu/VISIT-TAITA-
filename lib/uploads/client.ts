// Browser-side helpers for picture uploads. Nothing here is trusted by the server — it re-checks everything — these only make
// the experience good: big phone photos are scaled down BEFORE upload so they don't take minutes on a mobile connection.
import { CLIENT_RESIZE_ABOVE_BYTES, MAX_UPLOAD_BYTES } from "@/lib/uploads/policy";

export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
/** Absolute ceiling for what we'll even try to read in the browser. */
export const MAX_SOURCE_BYTES = 40_000_000;

/** A message if this file can't be used at all (checked before anything is read or sent), otherwise null. */
export function checkFile(file: { name: string; type: string; size: number }): string | null {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    return "That's an iPhone HEIC photo, which we can't read. On your iPhone choose Settings → Camera → Formats → Most Compatible, or share the photo as a JPEG, and try again.";
  }
  if (!OK_TYPES.has(file.type)) return "Please choose a JPEG, PNG or WebP picture.";
  if (file.size > MAX_SOURCE_BYTES) return "That file is far too large to upload — please choose a smaller picture.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

export type Bitmap = { width: number; height: number; close?: () => void };
export type ResizeDeps = {
  decode: (file: Blob) => Promise<Bitmap>;
  /** Draws the bitmap at the given size and encodes it. */
  encode: (bitmap: Bitmap, width: number, height: number, type: "image/jpeg" | "image/png", quality: number) => Promise<Blob | null>;
};

/**
 * Small enough? Send the ORIGINAL, untouched — full quality (the server resizes it properly). Too big? Scale it down to
 * `maxEdge` and re-encode, lowering quality (then size) only as far as needed to get under the limit.
 */
export async function prepareForUpload(file: File | Blob & { type: string }, opts: { maxEdge: number; keepAlpha: boolean }, deps: ResizeDeps, maxBytes = MAX_UPLOAD_BYTES): Promise<Blob> {
  if (file.size <= CLIENT_RESIZE_ABOVE_BYTES && OK_TYPES.has(file.type)) return file;
  let bitmap: Bitmap;
  try {
    bitmap = await deps.decode(file);
  } catch {
    throw new Error("We couldn't read that picture — please try a JPEG or PNG.");
  }
  try {
    const type = opts.keepAlpha ? "image/png" : "image/jpeg"; // logos keep their transparency; photos become JPEG for size
    let edge = Math.min(opts.maxEdge, Math.max(bitmap.width, bitmap.height));
    for (let round = 0; round < 4; round++) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
      for (const q of type === "image/png" ? [1] : [0.9, 0.85, 0.8, 0.7]) {
        const blob = await deps.encode(bitmap, w, h, type, q);
        if (blob && blob.size <= maxBytes) return blob;
      }
      edge = Math.round(edge * 0.75); // still too big: make it smaller and try again
    }
  } finally {
    bitmap.close?.();
  }
  throw new Error("That picture is too large to upload even after shrinking it — please choose a smaller one.");
}

/** The real browser implementation of ResizeDeps. */
export const browserDeps: ResizeDeps = {
  decode: async (file) => {
    if (typeof createImageBitmap === "function") return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions); // applies the camera's rotation
    return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img as unknown as Bitmap); }; img.onerror = () => reject(new Error("decode")); img.src = url; });
  },
  encode: (bitmap, w, h, type, quality) => new Promise((resolve) => {
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return resolve(null);
    if (type === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); } // a see-through photo goes on white
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, w, h);
    canvas.toBlob((b) => resolve(b), type, quality);
  }),
};

export type UploadResult = { url: string; width: number; height: number };

/** POSTs the picture with real progress. Resolves with the stored picture or rejects with a message fit to show. */
export function uploadImage(blob: Blob, purpose: string, onProgress?: (fraction: number) => void, XHR: typeof XMLHttpRequest = XMLHttpRequest): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XHR();
    xhr.open("POST", `/api/uploads/image?purpose=${encodeURIComponent(purpose)}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress?.(Math.min(1, e.loaded / e.total)); };
    xhr.onerror = () => reject(new Error("The upload was interrupted — please check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("The upload took too long — please try again."));
    xhr.timeout = 120_000;
    xhr.onload = () => {
      let data: any = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status === 200 && data && typeof data.url === "string") return resolve({ url: data.url, width: data.width, height: data.height });
      reject(new Error(typeof data?.error === "string" ? data.error : xhr.status === 413 ? "That picture is too large." : "We couldn't upload that picture — please try again."));
    };
    xhr.send(blob);
  });
}
