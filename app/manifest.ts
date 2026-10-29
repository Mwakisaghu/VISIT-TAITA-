import type { MetadataRoute } from "next";

// What a phone needs to offer "add to home screen" and open the site like an app. The colours are the site's own (ink and parchment). The icons are the logo, made at the two sizes browsers ask for.
// Saving pages for offline use is a separate thing: it only happens when a visitor presses "Save for offline" (see public/sw.js and docs/offline.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Visit Taita",
    short_name: "Visit Taita",
    description: "Discover Taita Taveta: where to stay, what to do, and everything you need before you come.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ECE3CD",
    theme_color: "#1B1815",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [{ name: "Visitor essentials", url: "/essentials", description: "How to get here, when to go, money and safety" }],
  };
}
