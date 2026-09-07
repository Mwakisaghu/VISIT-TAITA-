import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://visittaita.example"),
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
  },
  twitter: {
    card: "summary_large_image",
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
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-body">
        <Providers>
          <Nav />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
