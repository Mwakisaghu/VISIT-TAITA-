"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPT } from "@/lib/uploads/client";
import { POLICIES, type Purpose } from "@/lib/uploads/policy";
import { useImageUpload } from "@/components/uploads/useImageUpload";

const labelCls = "font-body text-sm text-stone/70";
const buttonCls = "focus-ring inline-flex w-fit cursor-pointer items-center rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust";

/**
 * A picture field. The person chooses a picture; it is uploaded, checked and cleaned by the server; and the address of the
 * stored picture is what the form submits under `name` — so the form's save logic is exactly what it was when this was a URL box.
 * If uploads aren't set up yet it falls back to a plain address box rather than leaving the form unusable.
 */
export default function ImageField({ name, label = "Image", purpose, defaultValue = "", required = false }: { name: string; label?: string; purpose: Purpose; defaultValue?: string | null; required?: boolean }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const { enabled, min, busy, progress, error, upload } = useImageUpload(purpose);
  const fileRef = useRef<HTMLInputElement>(null);
  const holdRef = useRef<HTMLInputElement>(null);
  const p = POLICIES[purpose];

  // While a picture is still uploading, the form can't be submitted (it would save the OLD value).
  useEffect(() => { holdRef.current?.setCustomValidity(busy ? "Please wait for the picture to finish uploading." : ""); }, [busy]);

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again works
    if (!file) return;
    const url = await upload(file);
    if (url) setValue(url);
  }

  const w = min?.width ?? p.minWidth, h = min?.height ?? p.minHeight;

  if (enabled === false) {
    return (
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{label} (web address)</span>
          <input name={name} value={value} onChange={(e) => setValue(e.target.value)} required={required} inputMode="url" placeholder="https://…" className="input" />
        </label>
        <p className="font-body text-xs text-stone/50">Picture uploads aren&apos;t set up on this site yet, so paste the address of a picture instead.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>{label}{required ? "" : " (optional)"}</span>

      {/* The value that is submitted. Visually hidden but present, so the browser's own "required" check works. It must NOT be
          readOnly or disabled: browsers exempt those from validation, which would let a required field be saved empty. */}
      <input ref={holdRef} name={name} value={value} required={required} onChange={() => {}} tabIndex={-1} aria-hidden="true" autoComplete="off" className="sr-only" />

      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={`Current ${p.label}`} className="h-40 w-full max-w-sm rounded-sm bg-stone/10 object-cover" />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className={`${buttonCls} ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <input ref={fileRef} type="file" accept={ACCEPT} onChange={choose} disabled={busy || enabled === null} className="sr-only" aria-label={`${value ? "Replace" : "Choose"} ${label.toLowerCase()}`} />
          {busy ? "Uploading…" : value ? "Replace picture" : "Choose a picture"}
        </label>
        {value && !required && !busy && (
          <button type="button" onClick={() => setValue("")} className="focus-ring font-body text-sm text-stone/60 underline hover:text-rust">
            Remove
          </button>
        )}
      </div>

      {busy && (
        <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-stone/10">
          <div className="h-full bg-rust transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <p role="status" className="sr-only">{busy ? `Uploading ${Math.round(progress * 100)} percent` : ""}</p>
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}

      <p className="font-body text-xs text-stone/50">
        JPEG, PNG or WebP, at least {w}×{h} px so it stays sharp. Big photos are resized for you, and location data is removed.
      </p>
    </div>
  );
}
