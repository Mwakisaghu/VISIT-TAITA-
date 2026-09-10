"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/components/marketplace/CartProvider";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/stories", label: "Stories" },
  { href: "/events", label: "Events" },
  { href: "/shop", label: "Shop" },
];

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const { count } = useCart();
  const isAdmin = !!session && ADMIN_ROLES.includes(session.user.role);

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
          {session && (
            <Link href="/passport" className="focus-ring rounded-sm transition-colors hover:text-ochre">
              Passport
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="focus-ring rounded-sm transition-colors hover:text-ochre">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/shop/cart"
            className="focus-ring rounded-sm transition-colors hover:text-ochre"
            aria-label="Cart"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
          {status === "authenticated" ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="focus-ring rounded-full border border-parchment/30 px-4 py-2 font-body text-sm transition-colors hover:border-ochre hover:text-ochre"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="focus-ring rounded-full border border-parchment/30 px-4 py-2 font-body text-sm transition-colors hover:border-ochre hover:text-ochre"
            >
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link href="/shop/cart" className="focus-ring font-body text-sm" aria-label="Cart">
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="focus-ring rounded-sm p-2"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-6 bg-parchment" />
            <span className="mt-1.5 block h-0.5 w-6 bg-parchment" />
            <span className="mt-1.5 block h-0.5 w-4 bg-parchment" />
          </button>
        </div>
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
          {session && (
            <Link href="/passport" onClick={() => setOpen(false)} className="focus-ring rounded-sm py-3">
              Passport
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className="focus-ring rounded-sm py-3">
              Admin
            </Link>
          )}
          {status === "authenticated" ? (
            <button
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="focus-ring rounded-sm py-3 text-left text-ochre"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="focus-ring rounded-sm py-3 text-ochre">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
