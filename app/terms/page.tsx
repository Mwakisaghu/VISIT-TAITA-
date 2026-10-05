import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { termsSections } from "@/lib/legal-text";
import { readSiteInfo } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using Visit Taita.",
};
export const revalidate = 3600;

export default function TermsPage() {
  const info = readSiteInfo();
  return <LegalPage title="Terms of Use" sections={termsSections(info)} info={info} intro="The ground rules for using Visit Taita — written to be read." />;
}
