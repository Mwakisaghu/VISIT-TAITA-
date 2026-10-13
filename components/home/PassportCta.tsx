"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowIcon } from "@/components/home/icons";
import { primaryCta } from "@/components/home/ui";
import { useI18n } from "@/lib/i18n/client";

/** The one personal bit of the (cached, public) homepage: the button says what is true for whoever is looking. */
export default function PassportCta() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const { tr, lp } = useI18n();
  return (
    <Link href={lp(signedIn ? "/passport" : "/register")} className={primaryCta}>
      {signedIn ? tr("Open your passport") : tr("Start your passport")} <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
