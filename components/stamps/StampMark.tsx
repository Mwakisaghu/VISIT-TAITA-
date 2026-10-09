import { useId } from "react";

/** A round passport stamp. Verified check-ins get a solid rust stamp; a self-reported visit gets a lighter one. */
export default function StampMark({ name, verified, size = 96 }: { name: string; verified: boolean; size?: number }) {
  const id = useId().replace(/:/g, ""); const colour = verified ? "#A6431E" : "#7E3117"; const word = verified ? "CHECKED IN" : "BEEN HERE";
  const label = name.toUpperCase().slice(0, 22);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${verified ? "Checked in" : "Marked as visited"}: ${name}`} style={{ transform: "rotate(-8deg)", flex: "none" }}>
      <defs><path id={`ring-${id}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke={colour} strokeWidth="2.6" strokeDasharray={verified ? undefined : "5 3"} />
      <circle cx="60" cy="60" r="36" fill="none" stroke={colour} strokeWidth="1" />
      {/* The lettering is fitted to the ring exactly (one lap of 276 units), so a short or a long name never overlaps itself. */}
      <text fontSize="9" fontWeight="800" fill={colour}><textPath href={`#ring-${id}`} textLength="270" lengthAdjust="spacing">{word} · {label} ·</textPath></text>
      <path d="M42 76 L56 50 L64 62 L70 54 L82 76Z" fill="none" stroke={colour} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}
