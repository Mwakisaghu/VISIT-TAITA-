import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { privacySections } from "@/lib/legal-text";
import { readSiteInfo } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data Visit Taita collects, why, who sees it, and the choices you have.",
};
export const revalidate = 3600;

export default function PrivacyPage() {
  const info = readSiteInfo();
  return <LegalPage title="Privacy Policy" sections={privacySections(info)} info={info} intro="Plain words about your data: what we collect, why, who sees it, and how to take it back." />;
}
