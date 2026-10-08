import { initials } from "@/lib/field-guide";

/** A named person on a listing: "Led by Hosea Mwamburi · Guide". No photograph is required (initials stand in), because people need to agree to be pictured. */
export default function PersonChip({ name, role, verb = "Led by", tone = "ink", size = "md" }: { name: string; role?: string | null; verb?: string; tone?: "ink" | "light"; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[0.65rem]" : "h-10 w-10 text-xs";
  return (
    <span className={`inline-flex items-center gap-3 font-body ${tone === "light" ? "text-parchment" : "text-stone"}`}>
      <span aria-hidden="true" className={`grid ${dim} flex-none place-items-center rounded-full border-2 border-parchment bg-rust font-extrabold text-parchment`}>{initials(name)}</span>
      <span className="text-[0.85rem] leading-tight">
        {verb} <b className="font-bold">{name}</b>
        {role && <span className={`block text-xs ${tone === "light" ? "text-parchment/85" : "text-stone/75"}`}>{role}</span>}
      </span>
    </span>
  );
}
