import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas, and /checkin/ whose URLs contain a secret QR token.
      disallow: ["/account", "/admin", "/api", "/checkin", "/bookings", "/crew", "/forgot-password", "/go", "/passport", "/partner", "/report", "/reset-password", "/search", "/verify-email"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
