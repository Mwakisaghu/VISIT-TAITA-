"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/actions/views";

/**
 * Counts one view of a cached page. It renders nothing, runs once per browser session per item, and
 * can never affect the page: any failure is swallowed.
 */
export default function ViewBeacon({ kind, id }: { kind: "NOTE" | "MISSION"; id: string }) {
  useEffect(() => {
    try {
      const key = `vt-view:${kind}:${id}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage can be blocked; the server-side limit still stops repeat counting.
    }
    void recordView(kind, id).catch(() => {});
  }, [kind, id]);

  return null;
}
