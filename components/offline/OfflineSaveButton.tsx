"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { SW_URL, ask, loadedAssets, pageUrl, savedAt as savedAtOf, supported } from "@/lib/offline-client";

type State = "checking" | "unsupported" | "idle" | "saving" | "saved" | "error";

/**
 * "Save for offline". Nothing is stored and no worker is installed until a visitor presses it. It keeps this one page (and the files it needs) on THIS device, says when it was saved,
 * can refresh the copy, and can remove it. If the browser cannot do it, the button is simply not there.
 */
export default function OfflineSaveButton({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const { tr, locale } = useI18n();
  const [state, setState] = useState<State>("checking");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!supported()) { setState("unsupported"); return; }
    let live = true;
    savedAtOf(pageUrl()).then((at) => {
      if (!live) return;
      if (at === null) { setState("idle"); return; }
      setSavedAt(at); setState("saved");
      navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {}); // already saved: keep the worker current (it refreshes the copy itself when the page is opened with a signal)
    });
    return () => { live = false; };
  }, []);

  async function save() {
    setState("saving");
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      const ready = await navigator.serviceWorker.ready;
      const worker = ready.active ?? reg.active;
      if (!worker) throw new Error("no worker");
      const r = await ask(worker, { type: "SAVE", url: pageUrl(), assets: loadedAssets() });
      if (!r.ok) throw new Error(r.error || "failed");
      const at = r.savedAt ?? Date.now();
      setSavedAt(at); setState("saved");
    } catch { setState("error"); } // if a copy already exists the screen keeps showing it, with the error beside it
  }
  async function remove() {
    try {
      const ready = await navigator.serviceWorker.ready;
      if (ready.active) await ask(ready.active, { type: "REMOVE", url: pageUrl() });
    } catch { /* the entry below is removed either way */ }
    setSavedAt(null); setState("idle");
  }
  if (state === "checking" || state === "unsupported") return null;
  const dark = tone === "dark";
  const ghost = `focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-[2px] border px-4 font-body text-[0.7rem] font-bold uppercase tracking-[0.14em] disabled:opacity-60 ${dark ? "border-parchment/60 text-parchment hover:bg-parchment hover:text-stone" : "border-stone text-stone hover:bg-stone hover:text-parchment"}`;
  const quiet = dark ? "text-parchment/85" : "text-stone/80";
  const date = savedAt ? new Date(savedAt).toLocaleDateString(document.documentElement.lang || locale, { day: "numeric", month: "short", year: "numeric" }) : "";
  return (
    <div className={className}>
      {state === "saved" || (state === "error" && savedAt) ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className={`flex items-center gap-2 font-body text-sm font-semibold ${dark ? "text-ochre-light" : "text-canopy"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></svg>
            {tr("Saved for offline")}{savedAt ? ` · ${tr("Saved on {date}", { date })}` : ""}
          </p>
          <button type="button" onClick={save} className={ghost}>{tr("Update the saved copy")}</button>
          <button type="button" onClick={remove} className={ghost}>{tr("Remove from this device")}</button>
        </div>
      ) : (
        <button type="button" onClick={save} disabled={state === "saving"} className={ghost}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 19h14" /></svg>
          {state === "saving" ? tr("Saving…") : tr("Save for offline")}
        </button>
      )}
      {state === "error" && <p role="alert" className={`mt-2 font-body text-sm font-semibold ${dark ? "text-ochre-light" : "text-rust-deep"}`}>{tr("Could not save this page. Check your connection and try again.")}</p>}
      <p className={`mt-2 max-w-md font-body text-xs ${quiet}`}>{tr("A copy is kept on this device only, and nothing is sent anywhere.")}</p>
    </div>
  );
}
