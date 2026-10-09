import PersonChip from "@/components/field/PersonChip";

/** "Meet your host": a named person with a line in their own words. Shown only when the listing has a named host. */
export default function HostCard({ name, role, quote, verb = "Hosted by" }: { name: string; role?: string | null; quote?: string | null; verb?: string }) {
  return (
    <section aria-label="Meet your host" className="rounded-[2px] border border-stone/15 p-6">
      <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rust-deep">Meet your host</p>
      <div className="mt-4"><PersonChip name={name} role={role} verb={verb} /></div>
      {quote && <p className="mt-4 max-w-prose font-display text-xl leading-snug text-stone">&ldquo;{quote}&rdquo;</p>}
    </section>
  );
}
