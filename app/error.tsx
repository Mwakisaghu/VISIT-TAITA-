"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Shown when something fails while a page is being built or used. Never shows the technical message (it can reveal internals); the short reference code lets someone find the failure in the logs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { tr, lp } = useI18n(); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { console.error(error); heading.current?.focus(); }, [error]);
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 ref={heading} tabIndex={-1} className="font-display text-3xl text-stone outline-none">{tr("Something went wrong on our side.")}</h1>
      <p className="mt-3 max-w-sm font-body text-stone/80">{tr("We couldn't load this page. Please try again, or go back to the home page.")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="focus-ring min-h-[44px] rounded-full bg-rust px-6 font-body text-sm text-parchment hover:bg-rust-deep">{tr("Try again")}</button>
        <Link href={lp("/")} className="focus-ring inline-flex min-h-[44px] items-center rounded-full border border-stone px-6 font-body text-sm text-stone hover:bg-stone hover:text-parchment">{tr("Back to Visit Taita")}</Link>
      </div>
      {error.digest && <p className="mt-6 font-body text-xs text-stone/80">{tr("Reference: {code}", { code: error.digest })}</p>}
    </div>
  );
}
