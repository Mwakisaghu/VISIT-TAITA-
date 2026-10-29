"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";

const subscribe = (cb: () => void) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; };

/** Says so, at the top of the page, when there is no signal: what is on screen is a copy saved earlier, and details like fares and fees may have changed. Nothing shows while online (and nothing is drawn on the server). */
export default function OfflineNotice() {
  const { tr } = useI18n();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <p role="status" className="bg-ochre-light px-6 py-3 text-center font-body text-sm font-semibold text-stone">{tr("You are offline. This is a copy saved earlier, so times, fares and fees may have changed.")}</p>;
}
