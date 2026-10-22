"use client";
import { useEffect } from "react";

// Reports a failure in a visitor's browser to /api/errors, so it reaches the admin's Error log. It sends only: what went wrong (the message and a technical trace), the page's path (never what comes after a ?),
// the page language, and, for the failure's reference, its digest. The server cleans it again, and takes the browser type from the request itself. A page reports at most 5 failures, each only once, so a loop
// cannot flood anything, and a failure while reporting is ignored.
const MAX_PER_PAGE = 5;
let sent = 0; let busy = false; const seen = new Set<string>();
const NOISE = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection captured|AbortError|The operation was aborted|cancelled$/i;
const EXTENSION = /(?:chrome|moz|safari|ms-browser)-extension:\/\//i;

export function reportClientError(error: unknown, kind = "error", extra?: string): void {
  try {
    if (typeof window === "undefined" || busy || sent >= MAX_PER_PAGE) return;
    const e = error as { message?: unknown; stack?: unknown; digest?: unknown } | null;
    const message = typeof e?.message === "string" ? e.message : typeof error === "string" ? error : "";
    const stack = typeof e?.stack === "string" ? e.stack : "";
    if (!message || NOISE.test(message) || EXTENSION.test(stack)) return;
    const key = `${kind}|${message}|${stack.split("\n")[1] ?? ""}`; if (seen.has(key)) return; seen.add(key);
    sent++; busy = true;
    const body = JSON.stringify({ kind, message: message.slice(0, 500), stack: stack.slice(0, 4000), extra: extra?.slice(0, 1000), digest: typeof e?.digest === "string" ? e.digest : undefined, path: window.location.pathname, locale: document.documentElement.lang || undefined });
    const queued = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
    if (!queued) fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* a failure while reporting a failure is ignored */ } finally { busy = false; }
}

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => reportClientError(ev.error ?? ev.message, "error");
    const onRejection = (ev: PromiseRejectionEvent) => reportClientError(ev.reason, "unhandledrejection");
    window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
