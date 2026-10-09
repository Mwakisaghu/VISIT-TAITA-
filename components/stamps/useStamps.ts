"use client";

import { useCallback, useEffect, useState } from "react";
import { toggleVisit } from "@/lib/actions/passport";
import { toggleWish } from "@/lib/actions/stamps";
import { NO_STAMPS, applyBeen, applyWish, sanitizeStamps, settle, type Stamps } from "@/lib/stamps";

/**
 * The signed-in person's stamps, loaded once after the page appears (so the page itself stays fast and cacheable for everyone).
 * Tapping a button changes the screen straight away; if the server says no, or the connection fails, it is undone and a message is shown.
 */
export function useStamps() {
  const [stamps, setStamps] = useState<Stamps>(NO_STAMPS);
  const [initial, setInitial] = useState<Stamps>(NO_STAMPS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    fetch("/api/stamps", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!off) { const s = sanitizeStamps(j); setStamps(s); setInitial(s); setLoaded(true); } })
      .catch(() => { if (!off) setLoaded(true); });
    return () => { off = true; };
  }, []);

  const run = useCallback(async (apply: (s: Stamps) => Stamps, call: () => Promise<{ ok: boolean; error?: string } | void>) => {
    if (busy) return;
    setBusy(true); setError(null);
    const before = stamps; setStamps(apply(before)); // shown at once
    const out = await settle(before, apply, call); // …and put right if the server says no
    setStamps(out.stamps); setError(out.error); setBusy(false);
  }, [busy, stamps]);

  const toggleWant = useCallback((id: string) => run((s) => applyWish(s, id), () => toggleWish(id)), [run]);
  const toggleBeen = useCallback((id: string) => run((s) => applyBeen(s, id), async () => { await toggleVisit(id); }), [run]);
  return { stamps, initial, loaded, error, busy, toggleWant, toggleBeen };
}
