"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cleanName, NAME_MAX, NAME_MIN } from "@/lib/account-security-rules";
import { updateMyName } from "@/lib/actions/account-security";
import { useI18n } from "@/lib/i18n/client";

const LINK = "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2 hover:text-stone";
const PRIMARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded bg-rust px-5 font-body text-sm font-bold text-white disabled:opacity-60";
const SECONDARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded border-2 border-stone px-5 font-body text-sm font-bold text-stone";

/** The person's name, with a way to change it: the value and the Edit button, or a small form with Save and Cancel. */
export default function EditNameForm({ name }: { name: string }) {
  const { tr } = useI18n(); const router = useRouter();
  const [open, setOpen] = useState(false); const [shown, setShown] = useState(name); const [value, setValue] = useState(name);
  const [error, setError] = useState(""); const [saved, setSaved] = useState(false); const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null); const edit = useRef<HTMLButtonElement>(null); const wasOpen = useRef(false);
  useEffect(() => { if (open) input.current?.focus(); else if (wasOpen.current) edit.current?.focus(); wasOpen.current = open; }, [open]);

  const reason = (code: string) => code === "name_short" ? tr("Use at least {min} characters.", { min: NAME_MIN })
    : code === "name_long" ? tr("Use at most {max} characters.", { max: NAME_MAX })
    : code === "name_invalid" ? tr("That name has characters we cannot accept. Please write your name as you would on a letter.")
    : code === "not_signed_in" ? tr("Please sign in again.") : code === "too_many" ? tr("Too many tries. Please wait a while and try again.")
    : code === "gone" ? tr("This account no longer exists.") : tr("Something went wrong — please try again.");

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const clean = cleanName(value); if (!clean.ok) { setError(reason(clean.code)); return; }
    if (clean.name === shown) { setOpen(false); return; } // nothing changed
    start(async () => {
      try { const r = await updateMyName(clean.name); if (!r.ok) setError(reason(r.code)); else { setShown(r.name); setValue(r.name); setOpen(false); setSaved(true); router.refresh(); } }
      catch { setError(reason("failed")); }
    });
  }

  if (!open) {
    return (
      <div className="flex w-full items-center justify-between gap-3">
        <span className="min-w-0 break-words">{shown}{saved && <span role="status" className="block text-[0.85rem] font-semibold text-canopy-deep">{tr("Name saved.")}</span>}</span>
        <button ref={edit} type="button" onClick={() => { setSaved(false); setError(""); setValue(shown); setOpen(true); }} aria-label={tr("Edit your name")} className={LINK}>{tr("Edit")}</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2.5" noValidate>
      <label htmlFor="account-name" className="font-body text-sm font-bold text-stone">{tr("Your name")}</label>
      <input id="account-name" ref={input} name="name" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="name" aria-invalid={error ? true : undefined} aria-describedby={error ? "account-name-error" : undefined} className="input w-full max-w-md" />
      {error && <p id="account-name-error" role="alert" className="font-body text-sm font-semibold text-rust-deep">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={PRIMARY}>{pending ? tr("Saving…") : tr("Save")}</button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} className={SECONDARY}>{tr("Cancel")}</button>
      </div>
    </form>
  );
}
