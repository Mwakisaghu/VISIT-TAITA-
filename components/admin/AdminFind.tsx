"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AdminIcon from "@/components/admin/AdminIcon";
import { searchNav, type NavGroup } from "@/lib/admin-nav";

/**
 * "Find a page" in the admin bar. Typing shows the matching pages (each with its section) under the box; Enter goes to the first; the Down arrow moves into the list, and the arrows move along it; Escape clears the box
 * (and from the list returns to it); Ctrl+K (or Cmd+K) jumps to the box from anywhere. It only ever offers pages this person may open (the groups it is given are already filtered by role).
 */
export default function AdminFind({ groups }: { groups: NavGroup[] }) {
  const router = useRouter(); const pathname = usePathname();
  const [query, setQuery] = useState(""); const input = useRef<HTMLInputElement>(null); const list = useRef<HTMLDivElement>(null);
  const results = searchNav(query, groups); const searching = query.trim().length > 0;

  useEffect(() => { setQuery(""); }, [pathname]); // after going somewhere, the box is clear again
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); input.current?.select(); } };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, []);

  const links = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
  return (
    <div className="relative w-full">
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) router.push(results[0].item.href); }}>
        <label htmlFor="admin-find" className="sr-only">Find a page</label>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B9B09B]"><AdminIcon name="search" /></span>
        <input
          id="admin-find" ref={input} type="search" value={query} autoComplete="off" placeholder="Find a page…" aria-controls="admin-find-results" aria-expanded={searching}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); else if (e.key === "ArrowDown" && searching) { e.preventDefault(); links()[0]?.focus(); } }}
          className="focus-ring h-10 w-full rounded-lg border border-[#4A443B] bg-[#2B2621] pl-10 pr-4 font-body text-sm text-parchment placeholder:text-[#B9B09B] sm:pr-16"
        />
        <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-[#4A443B] px-1.5 py-0.5 font-body text-xs text-[#B9B09B] sm:block">Ctrl K</kbd>
      </form>
      {searching && (
        <div
          id="admin-find-results" ref={list}
          onKeyDown={(e) => {
            const all = links(); const i = all.indexOf(document.activeElement as HTMLAnchorElement);
            if (e.key === "Escape") { e.preventDefault(); setQuery(""); input.current?.focus(); }
            else if (e.key === "ArrowDown" && i > -1) { e.preventDefault(); all[Math.min(all.length - 1, i + 1)]?.focus(); }
            else if (e.key === "ArrowUp" && i > -1) { e.preventDefault(); (i === 0 ? input.current : all[i - 1])?.focus(); }
          }}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-admin-border bg-white p-1.5 text-stone shadow-lg"
        >
          {results.length === 0 ? <p className="px-3 py-2 font-body text-sm text-admin-muted">Nothing matches “{query.trim()}”.</p> : (
            <ul>
              {results.map((r) => (
                <li key={r.item.href}>
                  <Link href={r.item.href} className="focus-ring flex min-h-[2.75rem] flex-col justify-center rounded-md px-3 py-1.5 hover:bg-admin-sel">
                    <span className="font-body text-sm font-semibold">{r.item.label}</span>
                    {r.group && <span className="font-body text-xs text-admin-muted">{r.group.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
