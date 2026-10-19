"use client";
// A six-digit code box: ONE real input, drawn as six stamp-slots. (Six separate boxes fail the accessible-authentication rule: pasting fills only the first.) It takes pasted codes with spaces,
// asks the phone for the number keyboard and for autofill from an authenticator or password manager, and tells its owner when the sixth digit arrives.
import { useEffect, useRef, useState } from "react";

type Props = { id: string; label: string; value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; invalid?: boolean; describedBy?: string; autoFocus?: boolean };
export default function CodeInput({ id, label, value, onChange, onComplete, invalid, describedBy, autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null); const [focused, setFocused] = useState(false);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const take = (raw: string) => { const d = raw.replace(/\D/g, "").slice(0, 6); onChange(d); if (d.length === 6) setTimeout(() => onComplete?.(d), 220); };
  const cur = Math.min(value.length, 5);
  return (
    <div className="mb-2">
      <label htmlFor={id} className="mb-1.5 block font-body text-[0.92rem] font-bold text-stone">{label}</label>
      <div className="relative max-w-[380px]">
        <div aria-hidden="true" className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`grid aspect-square min-h-12 place-items-center rounded-full border-2 bg-[#F6F0DF] font-display text-[1.7rem] font-semibold text-canopy-deep ${invalid ? "border-[#8E2A12]" : value[i] ? "border-canopy" : focused && i === cur ? "border-rust shadow-[0_0_0_3px_rgba(166,67,30,.22)]" : "border-dashed border-canopy/50"}`}>{value[i] ?? ""}</span>
          ))}
        </div>
        <input id={id} ref={ref} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" value={value} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(e) => take(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className="absolute inset-0 h-full w-full cursor-text opacity-0" />
      </div>
    </div>
  );
}
