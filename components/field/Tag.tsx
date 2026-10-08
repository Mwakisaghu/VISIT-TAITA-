import type { ReactNode } from "react";

const tones = {
  ink: "text-stone/85",
  rust: "text-rust-deep",
  gold: "text-ochre-light", // small gold text on dark backgrounds (the default gold is too dim there)
  light: "text-parchment",
  fill: "border-canopy bg-canopy text-parchment",
} as const;

/** One small fact in tracked capitals — "1,420 m · Highlands", "Moderate", "+350 m". The same voice on every card. */
export default function Tag({ children, tone = "ink", className = "" }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-current px-2.5 py-1 font-body text-[0.65rem] font-bold uppercase tracking-[0.14em] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
