import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import { BRAND } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";
import { readSiteInfo } from "@/lib/site-info";
import { readSocial } from "@/lib/social";
import { jsonLdString, organizationJsonLd } from "@/lib/structured-data";

// The picture WhatsApp, Instagram, Facebook and X show when a link to the site is shared.
const OG_IMAGE = { url: "/brand/og-default.png", width: 1200, height: 630, alt: `${BRAND.name} — ${BRAND.tagline}` };

const fraunces = localFont({
  src: "../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

const manrope = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Visit Taita — More Than a Place",
    template: "%s — Visit Taita",
  },
  description:
    "Visit Taita is a destination culture platform for Taita Taveta, Kenya — wildlife, culture, sport, food, adventure and the people who make it different.",
  openGraph: {
    title: "Visit Taita — More Than a Place",
    description:
      "Discover the wild, culture, people and sport that make Taita Taveta different.",
    siteName: "Visit Taita",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
    title: "Visit Taita — More Than a Place",
    description:
      "Discover the wild, culture, people and sport that make Taita Taveta different.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const social = readSocial();
  const info = readSiteInfo();
  const siteUrl = getSiteUrl();
  const organization = organizationJsonLd({
    name: BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}/brand/visit-taita-logo-square.png`,
    description: BRAND.description,
    email: info.contactEmail,
    sameAs: social.instagram ? [social.instagram.url] : [],
  });

  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-body">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organization) }} />
        <Providers>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
