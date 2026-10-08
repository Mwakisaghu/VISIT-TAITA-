"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Logo from "@/components/brand/Logo";
import { BagIcon, CloseIcon, MenuIcon, PassportIcon, SearchIcon, UserIcon } from "@/components/home/icons";
import { useCart } from "@/components/marketplace/CartProvider";

// The six ways into the site. ("Explore" is the map.) Everything else (Shop, Search, the account) is reachable but kept quiet.
const PRIMARY = [
  { href: "/discover", label: "Discover" },
  { href: "/map", label: "Explore" },
  { href: "/stay", label: "Stay" },
  { href: "/experiences", label: "Experiences" },
  { href: "/stories", label: "Stories" },
  { href: "/events", label: "Events" },
];

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
const iconBtn = "focus-ring relative flex h-11 w-11 items-center justify-center rounded-full text-parchment transition-colors hover:text-ochre";
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The site header. On the homepage it floats over the hero, transparent, and turns solid once you scroll; everywhere else it is a solid bar.
 * Admin, Partner and Crew links live in the account menu rather than the main bar. On a phone the menu opens full screen.
 */
export default function Nav() {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";
  const { data: session, status } = useSession();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const accountBtnRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const role = session?.user?.role as string | undefined;
  const isAdmin = !!role && ADMIN_ROLES.includes(role);
  const isPartner = role === "SELLER" || role === "PARTNER";
  const isCreator = role === "CREATOR";
  const signedIn = status === "authenticated";

  useEffect(() => { const on = () => setScrolled(window.scrollY > 24); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  useEffect(() => { setMenu(false); setAccount(false); }, [pathname]);

  // Full-screen menu: stop the page scrolling behind it, move focus in, keep Tab inside, Escape closes and focus goes back.
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    overlayRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenu(false); toggleRef.current?.focus(); return; }
      if (e.key !== "Tab") return;
      const nodes = [...(overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []), toggleRef.current].filter(Boolean) as HTMLElement[];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [menu]);

  // Account menu: closes on Escape (focus returns to its button) or a click anywhere else.
  useEffect(() => {
    if (!account) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setAccount(false); accountBtnRef.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccount(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [account]);

  const close = useCallback(() => setMenu(false), []);
  const overlay = isHome && !scrolled && !menu;
  const bar = isHome
    ? `fixed inset-x-0 top-0 ${overlay ? "bg-gradient-to-b from-stone/70 to-transparent" : "bg-stone/90 shadow-[0_1px_0_rgba(236,227,205,0.08)] backdrop-blur-md"}`
    : "sticky top-0 bg-stone/95 backdrop-blur";
  const current = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? ("page" as const) : undefined);
  const linkCls = "focus-ring relative rounded-sm py-3 font-body text-[0.8rem] font-medium tracking-wide transition-colors hover:text-ochre aria-[current=page]:text-ochre";
  const menuLink = "focus-ring block rounded-sm py-2.5 font-body text-sm text-parchment/90 transition-colors hover:text-ochre";

  return (
    <>
    <header className={`${bar} z-50 text-parchment transition-[background-color,box-shadow] duration-500 print:hidden`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-parchment focus:px-4 focus:py-2 focus:text-stone">Skip to content</a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" aria-label="Visit Taita — home" className="focus-ring shrink-0 rounded-sm"><Logo decorative className="h-11 w-auto text-parchment" /></Link>

        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {PRIMARY.map((l) => (<Link key={l.href} href={l.href} aria-current={current(l.href)} className={linkCls}>{l.label}</Link>))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/search" aria-label="Search" className={iconBtn}><SearchIcon className="h-5 w-5" /></Link>
          <Link href="/passport" className="focus-ring hidden h-11 items-center gap-2 rounded-full px-3 font-body text-[0.8rem] font-medium transition-colors hover:text-ochre md:flex"><PassportIcon className="h-5 w-5" />Passport</Link>
          <Link href="/shop/cart" aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"} className={iconBtn}>
            <BagIcon className="h-5 w-5" />
            {count > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 font-body text-[0.6rem] font-bold leading-none text-parchment">{count}</span>}
          </Link>

          <div ref={accountRef} className="relative hidden lg:block">
            <button ref={accountBtnRef} type="button" onClick={() => setAccount((v) => !v)} aria-expanded={account} aria-controls="account-menu" aria-label="Account" className={`${iconBtn} border border-parchment/30 hover:border-ochre`}><UserIcon className="h-5 w-5" /></button>
            {account && (
              <div id="account-menu" className="absolute right-0 mt-3 w-60 rounded-[2px] border border-parchment/15 bg-stone p-3 shadow-2xl">
                {signedIn ? (
                  <>
                    <p className="truncate px-1 pb-2 font-body text-xs text-parchment/55">{session?.user?.email}</p>
                    <Link href="/account" className={menuLink}>My account</Link>
                    <Link href="/passport" className={menuLink}>Passport</Link>
                    <Link href="/account/tickets" className={menuLink}>My tickets</Link>
                    <Link href="/account/bookings" className={menuLink}>My bookings</Link>
                    {isPartner && <Link href="/partner" className={menuLink}>Partner area</Link>}
                    {isCreator && <Link href="/crew" className={menuLink}>Crew</Link>}
                    {isAdmin && <Link href="/admin" className={menuLink}>Admin</Link>}
                    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="focus-ring mt-1 w-full rounded-sm border-t border-parchment/10 pt-3 text-left font-body text-sm text-ochre">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={menuLink}>Sign in</Link>
                    <Link href="/register" className={menuLink}>Create an account</Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button ref={toggleRef} type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? "Close menu" : "Open menu"} className={`${iconBtn} lg:hidden`}>{menu ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}</button>
        </div>
      </div>

    </header>
        {menu && (
          <div ref={overlayRef} id="mobile-menu" className="fixed inset-0 z-40 overflow-y-auto bg-stone px-6 pb-12 pt-28 text-parchment lg:hidden print:hidden">
            <nav aria-label="Main">
              <ul>
                {PRIMARY.map((l) => (
                  <li key={l.href} className="border-b border-parchment/10"><Link href={l.href} onClick={close} aria-current={current(l.href)} className="focus-ring block rounded-sm py-4 font-display text-4xl font-medium tracking-tight transition-colors hover:text-ochre aria-[current=page]:text-ochre">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
            <ul className="mt-8 grid grid-cols-2 gap-x-6">
              <li><Link href="/passport" onClick={close} className={menuLink}>Passport</Link></li>
              <li><Link href="/shop" onClick={close} className={menuLink}>Shop</Link></li>
              <li><Link href="/search" onClick={close} className={menuLink}>Search</Link></li>
              {signedIn ? (<><li><Link href="/account" onClick={close} className={menuLink}>My account</Link></li>
                {isPartner && <li><Link href="/partner" onClick={close} className={menuLink}>Partner area</Link></li>}
                {isCreator && <li><Link href="/crew" onClick={close} className={menuLink}>Crew</Link></li>}
                {isAdmin && <li><Link href="/admin" onClick={close} className={menuLink}>Admin</Link></li>}
                <li><button type="button" onClick={() => { close(); signOut({ callbackUrl: "/" }); }} className="focus-ring py-2.5 font-body text-sm text-ochre">Sign out</button></li></>
              ) : (<><li><Link href="/login" onClick={close} className={menuLink}>Sign in</Link></li><li><Link href="/register" onClick={close} className={menuLink}>Create an account</Link></li></>)}
            </ul>
          </div>
        )}
    </>
  );
}
