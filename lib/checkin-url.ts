// Builds the address a QR plaque encodes. Pure functions so the rules are easy
// to test: the base must be the PUBLIC site address, never localhost.

/** The public base URL of the site (no trailing slash), or null if not configured. */
export function checkinBaseUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = (env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

/** True for addresses a visitor's phone could never reach (localhost, loopback, private LAN). */
export function isLocalUrl(base: string): boolean {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return true;
  }
}

export function buildCheckinUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/checkin/${encodeURIComponent(token)}`;
}
