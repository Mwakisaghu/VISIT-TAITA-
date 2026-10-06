"use client";

import { useCallback, useEffect, useState } from "react";
import { POLICIES, type Purpose } from "@/lib/uploads/policy";
import { browserDeps, checkFile, prepareForUpload, uploadImage } from "@/lib/uploads/client";

type Status = { enabled: boolean | null; min?: { width: number; height: number } };

/** Shared by the single-picture and the picture-list fields. */
export function useImageUpload(purpose: Purpose) {
  const [info, setInfo] = useState<Status>({ enabled: null });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/uploads/image", { credentials: "same-origin" })
      .then(async (r) => {
        const d = r.ok ? await r.json() : null;
        const pol = d?.policies?.[purpose];
        if (live) setInfo({ enabled: !!d?.enabled && !!pol, min: pol ? { width: pol.minWidth, height: pol.minHeight } : undefined });
      })
      .catch(() => live && setInfo({ enabled: false }));
    return () => { live = false; };
  }, [purpose]);

  /** Returns the stored picture's address, or null (the reason is in `error`). */
  const upload = useCallback(async (file: File, keepError = false): Promise<string | null> => {
    if (!keepError) setError(""); // a batch passes keepError so one file's failure isn't erased by the next file's success
    const problem = checkFile(file);
    if (problem) { setError(problem); return null; }
    setBusy(true); setProgress(0);
    try {
      const p = POLICIES[purpose];
      const blob = await prepareForUpload(file, { maxEdge: p.maxEdge, keepAlpha: p.keepAlpha }, browserDeps);
      const out = await uploadImage(blob, purpose, setProgress);
      return out.url;
    } catch (e) {
      setError((e as Error).message || "We couldn't upload that picture — please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [purpose]);

  return { ...info, busy, progress, error, setError, upload };
}
