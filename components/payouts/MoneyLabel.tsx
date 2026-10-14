import type { MoneyLabelData } from "@/lib/money-label";
import { holdSentence } from "@/lib/money-label";
import { kes } from "@/lib/payout";

/** A plain label for where a guest's payment goes, laid out like a food label: who gets what, in shillings and as a share. */
export default function MoneyLabel({ data: d }: { data: MoneyLabelData }) {
  return (
    <section aria-labelledby="money-title" className="border-2 border-stone p-5">
      <h2 id="money-title" className="font-body text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-stone">Where your money goes</h2>
      <hr className="mb-4 mt-2 h-[5px] border-0 bg-stone" />
      <p className="font-body text-xs text-stone/80">Of the {kes(d.price)} you pay per person:</p>
      <ul className="mt-3 flex flex-col gap-4">
        <li>
          <p className="flex items-baseline justify-between gap-3 font-body text-sm font-bold text-stone"><span>To the host</span><span className="shrink-0 whitespace-nowrap">{kes(d.hostAmount)} · {d.hostPercent}%</span></p>
          <div aria-hidden="true" className="mt-1.5 h-2.5 bg-stone/10"><div className="h-full bg-canopy" style={{ width: `${d.hostPercent}%` }} /></div>
        </li>
        <li>
          <p className="flex items-baseline justify-between gap-3 font-body text-sm font-bold text-stone"><span>To keep Visit Taita running</span><span className="shrink-0 whitespace-nowrap">{kes(d.platformAmount)} · {d.platformPercent}%</span></p>
          <div aria-hidden="true" className="mt-1.5 h-2.5 bg-stone/10"><div className="h-full bg-rust" style={{ width: `${d.platformPercent}%` }} /></div>
        </li>
      </ul>
      <hr className="mt-4 border-stone/25" />
      <p className="mt-3 font-body text-[0.72rem] leading-snug text-stone/80">{holdSentence(d.holdDays)} If part of your payment is refunded, the split applies to what is kept. This is today&apos;s rate.</p>
    </section>
  );
}
