import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import CancelResetForm from "@/components/auth/CancelResetForm";
import { tr } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("Stop the reset of your two-step sign-in"), robots: { index: false, follow: false }, referrer: "no-referrer" }; }

// Opened from the link in the email. Public on purpose: the person may be unable to sign in. The secret is in the address, so the page asks for the referrer to be withheld.
export default async function CancelResetPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams;
  return (
    <AuthShell headline={tr("A second key for the door.")} sub={tr("Your password and a code from your phone: both, every time.")}>
      <h1 className="mb-6 font-display text-[clamp(1.7rem,4vw,2.2rem)] font-semibold leading-tight text-stone">{tr("Stop the reset of your two-step sign-in")}</h1>
      <CancelResetForm token={typeof token === "string" ? token : ""} />
    </AuthShell>
  );
}
