"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Logo from "@/components/brand/Logo";
import { BagIcon, CloseIcon, MenuIcon, PassportIcon, SearchIcon, UserIcon } from "@/components/home/icons";
import { useCart } from "@/components/marketplace/CartProvider";
import LanguageSwitcher, { LanguageLinks } from "@/components/i18n/LanguageSwitcher";
import { splitLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { T } from "@/lib/i18n/mark";

// The seven ways into the site. (The map is reached from Discover, the footer and the menu.) Everything else (Shop, Search, the account) is reachable but kept quiet.
const PRIMARY = [
  { href: "/discover", label: T("Discover") },
  { href: "/stay", label: T("Stay") },
  { href: "/experiences", label: T("Experiences") },
  { href: "/stories", label: T("Stories") },
  { href: "/events", label: T("Events") },
  { href: "/shop", label: T("Shop") },
  { href: "/plan", label: T("Plan") },
];

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
const iconBtn = "focus-ring relative flex h-11 w-11 items-center justify-center rounded-full text-parchment transition-colors hover:text-ochre";
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The site header. On the homepage it floats over the hero, transparent, and turns solid once you scroll; everywhere else it is a solid bar.
 * Admin, Partner and Crew links live in the account menu rather than the main bar. On a phone the menu opens full screen.
 */
export default function Nav() {
  const { tr, lp } = useI18n();
  const pathname = splitLocale(usePathname() || "/").rest.split(/[?#]/)[0] || "/";
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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-parchment focus:px-4 focus:py-2 focus:text-stone">{tr("Skip to content")}</a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        <Link href={lp("/")} aria-label={tr("Visit Taita — home")} className="focus-ring shrink-0 rounded-sm"><Logo decorative className="h-11 w-auto text-parchment" /></Link>

        <nav aria-label={tr("Main")} className="hidden items-center gap-9 lg:flex">
          {PRIMARY.map((l) => (<Link key={l.href} href={lp(l.href)} aria-current={current(l.href)} className={linkCls}>{tr(l.label)}</Link>))}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher className="hidden md:block" />
          <Link href={lp("/search")} aria-label={tr("Search")} className={iconBtn}><SearchIcon className="h-5 w-5" /></Link>
          <Link href={lp("/passport")} className="focus-ring hidden h-11 items-center gap-2 rounded-full px-3 font-body text-[0.8rem] font-medium transition-colors hover:text-ochre md:flex"><PassportIcon className="h-5 w-5" />{tr("Passport")}</Link>
          <Link href={lp("/shop/cart")} aria-label={count > 0 ? (count === 1 ? tr("Cart, {count} item", { count }) : tr("Cart, {count} items", { count })) : tr("Cart")} className={iconBtn}>
            <BagIcon className="h-5 w-5" />
            {count > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 font-body text-[0.6rem] font-bold leading-none text-parchment">{count}</span>}
          </Link>

          <div ref={accountRef} className="relative hidden lg:block">
            <button ref={accountBtnRef} type="button" onClick={() => setAccount((v) => !v)} aria-expanded={account} aria-controls="account-menu" aria-label={tr("Account")} className={`${iconBtn} border border-parchment/30 hover:border-ochre`}><UserIcon className="h-5 w-5" /></button>
            {account && (
              <div id="account-menu" className="absolute right-0 mt-3 w-60 rounded-[2px] border border-parchment/15 bg-stone p-3 shadow-2xl">
                {signedIn ? (
                  <>
                    <p className="truncate px-1 pb-2 font-body text-xs text-parchment/55">{session?.user?.email}</p>
                    <Link href={lp("/account")} className={menuLink}>{tr("My account")}</Link>
                    <Link href={lp("/passport")} className={menuLink}>{tr("Passport")}</Link>
                    <Link href={lp("/account/tickets")} className={menuLink}>{tr("My tickets")}</Link>
                    <Link href={lp("/account/bookings")} className={menuLink}>{tr("My bookings")}</Link>
                    {isPartner && <Link href={lp("/partner")} className={menuLink}>{tr("Partner area")}</Link>}
                    {isCreator && <Link href={lp("/crew")} className={menuLink}>{tr("Crew")}</Link>}
                    {isAdmin && <Link href={lp("/admin")} className={menuLink}>{tr("Admin")}</Link>}
                    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="focus-ring mt-1 w-full rounded-sm border-t border-parchment/10 pt-3 text-left font-body text-sm text-ochre">{tr("Sign out")}</button>
                  </>
                ) : (
                  <>
                    <Link href={lp("/login")} className={menuLink}>{tr("Sign in")}</Link>
                    <Link href={lp("/register")} className={menuLink}>{tr("Create an account")}</Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button ref={toggleRef} type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? tr("Close menu") : tr("Open menu")} className={`${iconBtn} lg:hidden`}>{menu ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}</button>
        </div>
      </div>

    </header>
        {menu && (
          <div ref={overlayRef} id="mobile-menu" className="fixed inset-0 z-40 overflow-y-auto bg-stone px-6 pb-12 pt-28 text-parchment lg:hidden print:hidden">
            <nav aria-label={tr("Main")}>
              <ul>
                {PRIMARY.map((l) => (
                  <li key={l.href} className="border-b border-parchment/10"><Link href={lp(l.href)} onClick={close} aria-current={current(l.href)} className="focus-ring block rounded-sm py-3.5 font-display text-2xl font-medium tracking-tight transition-colors hover:text-ochre aria-[current=page]:text-ochre">{tr(l.label)}</Link></li>
                ))}
              </ul>
            </nav>
            <ul className="mt-8 grid grid-cols-2 gap-x-6">
              <li><Link href={lp("/passport")} onClick={close} className={menuLink}>{tr("Passport")}</Link></li>
              <li><Link href={lp("/map")} onClick={close} className={menuLink}>{tr("Map")}</Link></li>
              <li><Link href={lp("/search")} onClick={close} className={menuLink}>{tr("Search")}</Link></li>
              {signedIn ? (<><li><Link href={lp("/account")} onClick={close} className={menuLink}>{tr("My account")}</Link></li>
                {isPartner && <li><Link href={lp("/partner")} onClick={close} className={menuLink}>{tr("Partner area")}</Link></li>}
                {isCreator && <li><Link href={lp("/crew")} onClick={close} className={menuLink}>{tr("Crew")}</Link></li>}
                {isAdmin && <li><Link href={lp("/admin")} onClick={close} className={menuLink}>{tr("Admin")}</Link></li>}
                <li><button type="button" onClick={() => { close(); signOut({ callbackUrl: "/" }); }} className="focus-ring py-2.5 font-body text-sm text-ochre">{tr("Sign out")}</button></li></>
              ) : (<><li><Link href={lp("/login")} onClick={close} className={menuLink}>{tr("Sign in")}</Link></li><li><Link href={lp("/register")} onClick={close} className={menuLink}>{tr("Create an account")}</Link></li></>)}
            </ul>
          <div className="mt-2 border-t border-parchment/15 pt-4"><p className="font-body text-[0.65rem] font-bold uppercase tracking-[0.22em] text-parchment/70">{tr("Language")}</p><LanguageLinks onPick={close} className="mt-1 text-parchment" /></div>
          </div>
        )}
    </>
  );
}
