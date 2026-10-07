/** @type {import('next').NextConfig} */
// Pictures people upload are served from the storage's public address; let Next's image optimiser fetch from it.
const storageHost = (() => {
  try {
    return new URL(process.env.S3_PUBLIC_URL || "").hostname || null;
  } catch {
    return null;
  }
})();

const nextConfig = {
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
