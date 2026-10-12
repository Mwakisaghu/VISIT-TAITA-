import { initials } from "@/lib/field-guide";

/** A maker's initials in a circle. A photograph is used only where the maker has agreed to be pictured; until then, the initials stand in. */
export default function MakerMark({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-8 w-8 text-[0.65rem]" : "h-11 w-11 text-sm";
  return <span aria-hidden="true" className={`grid ${dim} flex-none place-items-center rounded-full border-2 border-parchment bg-ochre font-body font-extrabold text-stone`}>{initials(name)}</span>;
}
