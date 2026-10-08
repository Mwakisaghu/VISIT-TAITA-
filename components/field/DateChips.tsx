import type { Chip } from "@/lib/field-guide";

const state = {
  open: "border-parchment/60 text-parchment",
  few: "border-ochre-light text-ochre-light",
  full: "border-parchment/40 text-parchment/80",
} as const;

/** The next dates, as small chips ("Sat 10 Oct · 6 spots"). Full dates are still shown, so people can see the experience runs; the wording carries the meaning, never colour alone. */
export default function DateChips({ chips }: { chips: Chip[] }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Next dates" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.label} className={`rounded-[2px] border bg-stone/45 px-3 py-2 font-body text-xs font-bold backdrop-blur-sm ${state[c.state]}`}>{c.label}</li>
      ))}
    </ul>
  );
}
