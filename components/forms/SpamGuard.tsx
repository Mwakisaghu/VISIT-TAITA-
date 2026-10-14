"use client";

import { useEffect, useRef } from "react";
import { HONEYPOT_FIELD, STARTED_FIELD } from "@/lib/spam";

/**
 * Two hidden fields for a public form (see lib/spam.ts): a trap that people never see, and the moment the form appeared.
 * It is hidden from screen readers and from the keyboard, so no one is slowed down or confused by it. Put it anywhere inside the <form>.
 */
export default function SpamGuard() {
  const started = useRef<HTMLInputElement>(null);
  useEffect(() => { if (started.current) started.current.value = String(Date.now()); }, []);
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      <input ref={started} type="hidden" name={STARTED_FIELD} defaultValue="" />
    </div>
  );
}
