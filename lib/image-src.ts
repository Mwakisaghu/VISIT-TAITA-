// Which pictures Next's image optimiser may resize for the visitor's screen.
//
// Next only optimises pictures from hosts approved in next.config.js (`images.remotePatterns`): the storage host (S3_PUBLIC_URL, where
// uploads live) and images.unsplash.com. A picture from anywhere else — a link a host pasted in — must be left as it is, or it would
// fail to load. This file is the same rule, so a component can ask before turning optimisation on.
//
// USE IT ONLY IN SERVER COMPONENTS. It reads a server-side setting; in the browser that setting doesn't exist, so a client component
// would disagree with the server render (a hydration mismatch).

/** Hosts that are always approved. Keep in step with next.config.js (a test checks they agree). */
export const FIXED_IMAGE_HOSTS = ["images.unsplash.com"];

export function optimizableHosts(env: Record<string, string | undefined> = process.env): string[] {
  const hosts = [...FIXED_IMAGE_HOSTS];
  try {
    const h = new URL(env.S3_PUBLIC_URL || "").hostname;
    if (h) hosts.push(h);
  } catch {
    /* storage not configured: only the fixed hosts */
  }
  return hosts;
}

/** True when the optimiser may be used for this picture: a file in /public, or an https picture on an approved host. */
export function canOptimize(src: unknown, env: Record<string, string | undefined> = process.env): boolean {
  if (typeof src !== "string") return false;
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith("/")) return !s.startsWith("//") && !s.startsWith("/\\") && !s.includes("?"); // a local file; "//host" is NOT local
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false; // the approved patterns allow https, default port only
  return optimizableHosts(env).includes(u.hostname);
}

/** The widths the optimiser accepts (Next's defaults: next.config.js doesn't change them). A request for any other width is refused. */
export const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/**
 * The address of a resized copy, for places that can't use <Image> (like a map popup, which is plain HTML). The width is rounded UP to
 * a size the optimiser accepts. A picture that can't be optimised is returned unchanged.
 */
export function optimizedUrl(src: string, width: number, quality = 75, env: Record<string, string | undefined> = process.env): string {
  if (!canOptimize(src, env)) return src;
  const w = OPTIMIZER_WIDTHS.find((x) => x >= width) ?? OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
  const q = Math.min(100, Math.max(1, Math.round(quality)));
  return `/_next/image?url=${encodeURIComponent(src.trim())}&w=${w}&q=${q}`;
}
