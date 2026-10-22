import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { refundSections } from "@/lib/refund-policy";
import { readSiteInfo } from "@/lib/site-info";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Refunds and cancellations",
  description: "How refunds and cancellations work for bookings, event tickets and shop orders.",
  ...shareMeta("Refunds and cancellations", "How refunds and cancellations work for bookings, event tickets and shop orders."),
};
export const revalidate = 3600;

export default function RefundsPage() {
  const info = readSiteInfo();
  return <LegalPage title="Refunds and cancellations" sections={refundSections(info)} info={info} intro="What you get back, and how to ask for it, for everything you can buy on Visit Taita." />;
}
