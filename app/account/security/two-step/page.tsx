import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubpageFrame from "@/components/account-hub/SubpageFrame";
import TwoStepPanel from "@/components/account-hub/TwoStepPanel";
import { getTwoStepState } from "@/lib/actions/two-step";
import { lp, tr } from "@/lib/i18n/server";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("Two-step sign-in"), robots: { index: false } }; }

export default async function TwoStepPage(props: { searchParams: Promise<{ required?: string; next?: string }> }) {
  const params = await props.searchParams;
  const state = await getTwoStepState();
  if (!state) redirect(`${lp("/login")}?next=${encodeURIComponent("/account/security/two-step")}`);
  const required = params.required === "1";
  // Where to go once it is on: back to what they were doing, or (for someone who was held here by the admin gate) the admin area.
  const after = safeNext(params.next ?? null) ?? (required ? "/admin" : "/account");
  return (
    <SubpageFrame title={tr("Two-step sign-in")} intro={tr("A second step when you sign in: a code from an app on your phone.")}>
      <TwoStepPanel state={state} required={required} after={after} />
    </SubpageFrame>
  );
}
