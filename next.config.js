/** @type {import('next').NextConfig} */
// Pictures people upload are served from the storage's public address; let Next's image optimiser fetch from it.
const storageHost = (() => {
  try {
    return new URL(process.env.S3_PUBLIC_URL || "").hostname || null;
  } catch {
    return null;
  }
})();

// The Content-Security-Policy: what a page may load, and from where. It starts in REPORT-ONLY mode: the browser tells /api/csp-report what it WOULD have blocked, and blocks nothing,
// so a mistake cannot break the map, payments or pictures. After a week of clean reports, set CSP_ENFORCE=1 in the hosting settings to make it enforce (see docs/security-headers.md).
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`, // Next.js writes small inline scripts into every page
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:", // pictures come from your storage, Unsplash and other https addresses; map tiles and the map marker too
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join("; ");
const cspHeader = { key: process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp };

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
    return [{ source: "/:path*", headers: [...securityHeaders, cspHeader] }];
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
