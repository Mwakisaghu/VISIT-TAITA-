import Link from "next/link";
import { lp, tr } from "@/lib/i18n/server";
import type { Chip } from "@/lib/account-hub-text";

export const CHIP_TONE: Record<Chip["tone"], string> = { good: "bg-canopy text-[#F6F0DF]", info: "bg-ochre-light text-stone", warn: "bg-rust-deep text-white" };

/** The frame every account list page shares: a way back, a title, and room for the list. */
export default function SubpageFrame({ title, intro, children, wide = false }: { title: string; intro?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="bg-parchment px-5 py-12 text-stone sm:px-8">
      <div className={`mx-auto ${wide ? "max-w-[72rem]" : "max-w-[44rem]"}`}>
        <Link href={lp("/account")} className="focus-ring inline-flex min-h-11 items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-2 hover:text-stone"><span aria-hidden="true" className="mr-1.5">←</span>{tr("My account")}</Link>
        <h1 className="mt-2 font-display text-[2.2rem] font-semibold leading-tight sm:text-[2.8rem]">{title}</h1>
        {intro && <p className="mt-2 max-w-[34rem] font-body text-base text-stone/80">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

// On a phone the status always sits under the title (so every card looks the same); on a wider screen it sits beside it.
/** `current` marks the card whose details are open beside the list (a ring, and aria-current for screen readers); `keepScroll` stops the page jumping to the top when the card opens them. */
export function ListCard({ title, href, meta, chip, children, current = false, keepScroll = false }: { title: string; href?: string; meta?: string; chip?: Chip; children?: React.ReactNode; current?: boolean; keepScroll?: boolean }) {
  return (
    <li className={`flex flex-col gap-2 rounded border bg-[#F6F0DF] p-5 ${current ? "border-rust ring-2 ring-rust" : "border-stone/15"}`}>
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-x-3">
        <h3 className="min-w-0 font-display text-[1.2rem] font-semibold leading-snug">{href ? <Link href={href} scroll={keepScroll ? false : undefined} aria-current={current ? "true" : undefined} className="focus-ring underline-offset-2 hover:text-rust-deep hover:underline">{title}</Link> : title}</h3>
        {chip && <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-[0.78rem] font-bold ${CHIP_TONE[chip.tone]}`}>{chip.text}</span>}
      </div>
      {meta && <p className="font-body text-sm text-stone/80">{meta}</p>}
      {children}
    </li>
  );
}

export function EmptyList({ title, body, actions }: { title: string; body: string; actions: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded border-2 border-dashed border-stone/35 p-6">
      <h2 className="font-display text-[1.3rem] font-semibold leading-snug">{title}</h2>
      <p className="font-body text-[0.95rem] text-stone/80">{body}</p>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {actions.map((a, i) => <Link key={a.href} href={a.href} className={i === 0 ? "focus-ring inline-flex min-h-12 items-center justify-center rounded bg-rust px-5 font-body text-[0.95rem] font-bold text-white" : "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2"}>{a.label}</Link>)}
      </div>
    </div>
  );
}
