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
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(storageHost ? [{ protocol: "https", hostname: storageHost }] : []),
    ],
  },
};

module.exports = nextConfig;
