"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * A group of footer links. From the sm breakpoint up it is an ordinary column. On a phone it becomes a tappable section that opens and closes (a long footer
 * stays short, and every group is still one tap away). Before the page has loaded, and without JavaScript, every group is simply open.
 */
export default function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [phone, setPhone] = useState(false); const [open, setOpen] = useState(false); const id = useId();
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)"); const on = () => setPhone(mq.matches); on();
    mq.addEventListener?.("change", on); return () => mq.removeEventListener?.("change", on);
  }, []);
  const heading = "font-body text-sm font-semibold uppercase tracking-wider text-ochre";
  return (
    <div className={phone ? "border-b border-parchment/15" : ""}>
      {phone ? (
        <h2><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={`focus-ring flex min-h-[52px] w-full items-center justify-between rounded-sm text-left ${heading}`}>
          {title}
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7.5l6 6 6-6" /></svg>
        </button></h2>
      ) : <h2 className={heading}>{title}</h2>}
      <ul id={id} hidden={phone && !open} className={`space-y-2.5 font-body text-sm ${phone ? "pb-5 pt-1" : "mt-4"}`}>{children}</ul>
    </div>
  );
}
