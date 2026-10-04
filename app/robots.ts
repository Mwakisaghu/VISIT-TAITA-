import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_APP_URL || "https://visittaita.example").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas, and /checkin/ whose URLs contain a secret QR token.
      disallow: ["/admin", "/api", "/checkin", "/passport", "/partner"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
