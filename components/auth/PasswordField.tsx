"use client";
// A password box with an eye to check what you typed (no "type it again" box needed), a Caps Lock hint, and the hints browsers and password managers need (see the autoComplete note below).
// Pasting is never blocked, and nothing limits the length, so a password manager's long password is never cut short.
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { PASSWORD_MIN } from "@/lib/password-policy";

type Props = {
  id: string; label: string; value: string; onChange: (v: string) => void;
  /** "current-password" when signing in (so a saved password is offered); "new-password" when choosing one (so the browser can offer to create a strong one and save it). */
  autoComplete: "current-password" | "new-password"; name?: string; describedBy?: string; invalid?: boolean; required?: boolean; inputRef?: React.Ref<HTMLInputElement>; children?: React.ReactNode;
};
const EYE = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z";
export const INPUT = "min-h-[52px] w-full rounded-lg border-[1.5px] border-stone/30 bg-[#F6F0DF] px-3.5 py-3 font-body text-base text-stone hover:border-stone/55 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-rust aria-[invalid=true]:border-2 aria-[invalid=true]:border-[#8E2A12]";

export default function PasswordField({ id, label, value, onChange, autoComplete, name = "password", describedBy, invalid, required = true, inputRef, children }: Props) {
  const { tr } = useI18n(); const [shown, setShown] = useState(false); const [caps, setCaps] = useState(false); const capsId = useId();
  const rules = autoComplete === "new-password" ? ({ passwordrules: `minlength: ${PASSWORD_MIN}; maxlength: 128;` } as Record<string, string>) : {};
  const watchCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-1.5 block font-body text-[0.92rem] font-bold text-stone">{label}</label>
      <div className="relative">
        <input id={id} name={name} ref={inputRef} type={shown ? "text" : "password"} value={value} required={required} autoComplete={autoComplete} aria-invalid={invalid || undefined} aria-describedby={[describedBy, caps ? capsId : ""].filter(Boolean).join(" ") || undefined}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => onChange(e.target.value)} onKeyDown={watchCaps} onKeyUp={watchCaps} onBlur={() => setCaps(false)} className={`${INPUT} pr-14 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`} {...rules} />
        <button type="button" aria-pressed={shown} aria-controls={id} aria-label={tr("Show password")}
          onClick={(e) => { setShown((s) => !s); if (e.detail > 0) document.getElementById(id)?.focus(); /* a tap or click returns the cursor to the box; from the keyboard focus STAYS on the button, so Space or Enter can toggle it back */ }}
          className="absolute right-0.5 top-0.5 grid h-12 w-12 place-items-center rounded-lg text-stone/80 hover:bg-stone/5 hover:text-stone focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-rust">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {shown ? (<><path d="M3 3l18 18" /><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.2 6.7C3.6 8.5 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>) : (<><path d={EYE} /><circle cx="12" cy="12" r="3" /></>)}
          </svg>
        </button>
      </div>
      <p id={capsId} role="status" className={caps ? "mt-2 flex items-center gap-2 font-body text-[0.86rem] font-bold text-rust-deep" : "sr-only"}>{caps ? tr("Caps Lock is on") : ""}</p>
      {children}
    </div>
  );
}
