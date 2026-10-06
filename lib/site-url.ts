// The site's public address, found the same way on Vercel and on Netlify (and anywhere else): the explicit setting wins, then
// whatever the host provides for the production site. Used for link previews, structured data and the sitemap.
// Set NEXT_PUBLIC_APP_URL to your real domain in production — it is what emails and QR codes use too.

const FALLBACK = "https://visittaita.example";

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (
    clean(env.NEXT_PUBLIC_APP_URL) ??
    clean(env.URL) ?? // Netlify: the primary URL of the site
    clean(env.VERCEL_PROJECT_PRODUCTION_URL) ?? // Vercel: the production domain
    clean(env.NEXTAUTH_URL) ??
    FALLBACK
  );
}
