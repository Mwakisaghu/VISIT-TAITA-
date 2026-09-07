"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/stories", label: "Stories" },
  { href: "/events", label: "Events" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-stone/95 backdrop-blur text-parchment">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg tracking-tight">
          Visit Taita
        </Link>

        <nav className="hidden gap-8 font-body text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-sm transition-colors hover:text-ochre"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/#newsletter"
          className="focus-ring hidden rounded-full border border-parchment/30 px-4 py-2 font-body text-sm transition-colors hover:border-ochre hover:text-ochre md:inline-block"
        >
          Taita is calling
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring rounded-sm p-2 md:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <span className="block h-0.5 w-6 bg-parchment" />
          <span className="mt-1.5 block h-0.5 w-6 bg-parchment" />
          <span className="mt-1.5 block h-0.5 w-4 bg-parchment" />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-parchment/10 px-6 pb-6 font-body text-sm md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="focus-ring rounded-sm py-3"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/#newsletter" onClick={() => setOpen(false)} className="focus-ring rounded-sm py-3 text-ochre">
            Taita is calling
          </Link>
        </nav>
      )}
    </header>
  );
}
