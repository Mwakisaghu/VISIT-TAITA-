import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { AccountRail, AttentionCards, ComingUp, HelpBand, HubCover, HubTiles, PassportCard, WorkBand } from "@/components/account-hub/HubBlocks";
import { SettingsPanels } from "@/components/account-hub/SettingsPanels";
import { loadAccountHub } from "@/lib/account-hub";
import { attention, comingCards, tiles as buildTiles, workBand } from "@/lib/account-hub-text";
import { authOptions } from "@/lib/auth";
import { lp, tr } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tr("My account") };
}

// Personal to the signed-in person: never cached.
export const dynamic = "force-dynamic";

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-parchment px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-[40rem]">
        <p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-rust-deep">{tr("My account")}</p>
        <h1 className="mt-2.5 font-display text-[2.4rem] font-semibold leading-tight text-stone">{tr("My account")}</h1>
        {children}
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <Plain>
        <p className="mt-4 font-body text-stone/80">{tr("Sign in to manage your account and your data.")}</p>
        <Link href={`${lp("/login")}?next=%2Faccount`} className="focus-ring mt-6 inline-flex min-h-12 items-center rounded bg-rust px-7 font-body text-sm font-bold text-white hover:bg-rust-deep">{tr("Sign in")}</Link>
      </Plain>
    );
  }

  const hub = await loadAccountHub(session.user.id);
  if (!hub) return <Plain><p className="mt-4 font-body text-stone/80">{tr("This account no longer exists.")}</p></Plain>;

  const t = buildTiles(hub), band = workBand(hub);
  return (
    <div className="bg-parchment text-stone">
      <HubCover hub={hub}><PassportCard hub={hub} /></HubCover>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-5 pb-6 pt-10 sm:px-8 lg:pt-12">
        <AccountRail tiles={t} />
        <div className="min-w-0 flex-[999_1_600px]">
          <AttentionCards items={attention(hub)} />
          <ComingUp cards={comingCards(hub)} />
          <WorkBand band={band} />
          <HubTiles id="everything-h" title={band ? tr("Your Taita") : tr("Everything in your account")} sub={band ? tr("Your own trips, tickets and saved places, as a visitor.") : tr("Every part of your Taita, one tap away.")} tiles={t} />
          <SettingsPanels hub={hub} />
          <HelpBand />
        </div>
      </div>
    </div>
  );
}
