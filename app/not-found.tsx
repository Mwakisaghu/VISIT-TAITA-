import Link from "next/link";
import { lp, tr } from "@/lib/i18n/server";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-stone">{tr("This trail ends here.")}</h1>
      <p className="mt-3 max-w-sm font-body text-stone/80">{tr("We couldn't find that page. It may have moved, or hasn't been mapped yet.")}</p>
      <Link href={lp("/")} className="focus-ring mt-8 inline-flex min-h-[44px] items-center rounded-full bg-rust px-6 font-body text-sm text-parchment hover:bg-rust-deep">{tr("Back to Visit Taita")}</Link>
    </div>
  );
}
