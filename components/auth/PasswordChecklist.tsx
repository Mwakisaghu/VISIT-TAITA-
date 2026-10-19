"use client";
// Four plain lines that tick as you type. They are exactly the rules the server applies (lib/password-policy.ts passwordChecks), and they never ask for symbols or capitals.
import { useI18n } from "@/lib/i18n/client";
import { PASSWORD_MIN, passwordChecks } from "@/lib/password-policy";

export default function PasswordChecklist({ id, password, name, email }: { id: string; password: string; name?: string; email?: string }) {
  const { tr } = useI18n(); const c = passwordChecks(password, { name, email });
  const rows: [boolean, string][] = [[c.length, tr("At least {min} characters", { min: PASSWORD_MIN })], [c.common, tr("Not a common password")], [c.personal, tr("Doesn't contain your name or email")], [c.pattern, tr("Not a repeated or in-a-row pattern")]];
  return (
    <ul id={id} aria-label={tr("Password checks")} className="mt-2.5 grid gap-1 font-body text-[0.88rem]">
      {rows.map(([ok, text]) => (
        <li key={text} data-ok={ok} className={`flex items-center gap-2 ${ok ? "font-bold text-canopy" : "text-stone/80"}`}>
          <span aria-hidden="true" className={`grid h-4 w-4 flex-none place-items-center rounded-full border-2 ${ok ? "border-canopy bg-canopy text-white" : "border-stone/30"}`}>{ok && <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5l2.5 2.5L12 5.5" /></svg>}</span>
          <span><span className="sr-only">{ok ? tr("Done:") : tr("Not yet:")} </span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
