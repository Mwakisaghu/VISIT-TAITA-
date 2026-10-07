/** @type {import('next').NextConfig} */
// Pictures people upload are served from the storage's public address; let Next's image optimiser fetch from it.
const storageHost = (() => {
  try {
    return new URL(process.env.S3_PUBLIC_URL || "").hostname || null;
  } catch {
    return null;
  }
})();

// Sent with every page. See README ("Security headers") for what each does.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Uploaded pictures never change (every upload gets a new random name), so the resized copies can be kept for a month rather than the
    // default 60 seconds — visitors and the server stop redoing the same work.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(storageHost ? [{ protocol: "https", hostname: storageHost }] : []),
    ],
  },
};

module.exports = nextConfig;
