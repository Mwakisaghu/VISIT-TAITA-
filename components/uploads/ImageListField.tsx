"use client";

import { useRef, useState } from "react";
import { ACCEPT } from "@/lib/uploads/client";
import { POLICIES, type Purpose } from "@/lib/uploads/policy";
import { useImageUpload } from "@/components/uploads/useImageUpload";

const buttonCls = "focus-ring inline-flex w-fit cursor-pointer items-center rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust";

/**
 * Several pictures (a Field Note's photos). The form submits their addresses one per line under `name` — the same shape the
 * form used when this was a box of links, so nothing else has to change. Falls back to that box if uploads aren't set up.
 */
export default function ImageListField({ name, label, purpose, defaultValue = "", max }: { name: string; label: string; purpose: Purpose; defaultValue?: string; max: number }) {
  const [urls, setUrls] = useState<string[]>(() => defaultValue.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
  const { enabled, busy, progress, error, upload } = useImageUpload(purpose);
  const [text, setText] = useState(defaultValue);
  const p = POLICIES[purpose];
  const ref = useRef<HTMLInputElement>(null);

  if (enabled === false) {
    return (
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">{label} — web addresses, one per line</span>
        <textarea name={name} value={text} onChange={(e) => setText(e.target.value)} rows={3} className="input" placeholder="https://…" />
        <span className="font-body text-xs text-stone/50">Picture uploads aren&apos;t set up on this site yet.</span>
      </label>
    );
  }

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    let next = urls;
    let first = true;
    for (const f of files) {
      if (next.length >= max) break;
      const url = await upload(f, !first); // the first file clears the old message; later ones keep any failure already shown
      first = false;
      if (url) { next = [...next, url]; setUrls(next); }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-sm text-stone/70">{label} — up to {max}</span>
      <textarea name={name} value={urls.join("\n")} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />

      {urls.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((u, i) => (
            <li key={u + i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Photo ${i + 1}`} className="h-28 w-full rounded-sm bg-stone/10 object-cover" />
              <button type="button" onClick={() => setUrls(urls.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="focus-ring absolute right-1 top-1 rounded-full bg-stone/80 px-2 py-0.5 font-body text-xs text-parchment hover:bg-rust">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {urls.length < max && (
        <label className={`${buttonCls} ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <input ref={ref} type="file" accept={ACCEPT} multiple onChange={add} disabled={busy || enabled === null} className="sr-only" aria-label="Add photos" />
          {busy ? "Uploading…" : urls.length ? "Add another photo" : "Add photos"}
        </label>
      )}
      {busy && <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-stone/10"><div className="h-full bg-rust" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      <p className="font-body text-xs text-stone/50">JPEG, PNG or WebP, at least {p.minWidth}×{p.minHeight} px. Location data is removed from every photo.</p>
    </div>
  );
}
