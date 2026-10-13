import type { Metadata } from "next";

// What a shared link looks like in WhatsApp, Facebook, X and the like: the page's OWN title and description (never the homepage's), with a picture.
// A page that sets its own openGraph replaces the site-wide one completely, so the picture, site name and type must be repeated here.
export const OG_IMAGE = { url: "/brand/og-default.png", width: 1200, height: 630, alt: "Visit Taita — More than a place." };
export function shareMeta(title: string, description: string, image?: { url: string; alt?: string }): Pick<Metadata, "openGraph" | "twitter"> {
  const t = String(title ?? "").trim(); const d = String(description ?? "").trim();
  return {
    openGraph: { title: /Visit Taita/i.test(t) ? t : `${t} — Visit Taita`, description: d, siteName: "Visit Taita", type: "website", images: [image ? { url: image.url, alt: image.alt ?? t } : OG_IMAGE] },
    twitter: { card: "summary_large_image" }, // X reads the title, description and picture from the openGraph tags above
  };
}
