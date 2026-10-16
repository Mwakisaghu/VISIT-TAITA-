"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import "@/components/passport/book/passport.css";
import { InkFilter } from "@/components/passport/book/Art";
import { CoverPage, EndPage, RewardsPage, SealsPage, YouPage, ZonePageView, zoneText, type Ctx } from "@/components/passport/book/PassportPages";
import PlaceSheet from "@/components/passport/book/PlaceSheet";
import { toggleVisit, type CheckinResult } from "@/lib/actions/passport";
import { toggleWish } from "@/lib/actions/stamps";
import { useI18n } from "@/lib/i18n/client";
import { contentPages, pageKey, sheetsOf, spreadsOf, zoneOf, type PageSpec, type PassportData, type PassportPlace } from "@/lib/passport-book";

const NARROW = "(max-width: 820px)";

export default function PassportBook({ data }: { data: PassportData }) {
  const { tr, locale, lp } = useI18n(); const router = useRouter(); const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const content = useMemo(() => contentPages(data.places), [data.places]);
  const sheets = useMemo(() => sheetsOf(content), [content]);
  const spreads = useMemo(() => spreadsOf(sheets), [sheets]);
  const allPages = useMemo<PageSpec[]>(() => [{ kind: "cover" }, ...content], [content]);
  const [ready, setReady] = useState(false); const [single, setSingle] = useState(false);
  const [idx, setIdx] = useState(0); const [plain, setPlain] = useState(false); const [motion, setMotion] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null); const [just, setJust] = useState<string | null>(null);
  const [status, setStatus] = useState(""); const [busyWish, setBusyWish] = useState<string | null>(null);
  const [, startTransition] = useTransition(); const dlg = useRef<HTMLDialogElement>(null);
  const maxIdx = single ? allPages.length - 1 : sheets.length - 1;

  // The server sends the closed cover; once this runs in the browser we know the screen size and the person's motion setting.
  useEffect(() => {
    const narrow = window.matchMedia(NARROW), calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSingle(narrow.matches); setMotion(!calm.matches); setReady(true);
    const onNarrow = () => { setSingle(narrow.matches); setIdx(0); }, onCalm = () => setMotion(!calm.matches);
    narrow.addEventListener("change", onNarrow); calm.addEventListener("change", onCalm);
    return () => { narrow.removeEventListener("change", onNarrow); calm.removeEventListener("change", onCalm); };
  }, []);

  /** The position that shows a page: on a phone, its own number; on a wide screen, the spread it is in (the back of a sheet shows one turn later than its front). */
  const positionOf = useCallback((key: string): number => {
    if (single) return Math.max(0, allPages.findIndex((p) => pageKey(p) === key));
    for (let i = 0; i < sheets.length; i++) { if (pageKey(sheets[i][0]) === key) return i; const b = sheets[i][1]; if (b && pageKey(b) === key) return i + 1; }
    return 0;
  }, [single, allPages, sheets]);

  // "Want to go" on the account page links here: open the booklet at that page.
  useEffect(() => {
    if (!ready) return;
    const go = () => { if (window.location.hash === "#want-to-go") { setIdx(positionOf("rewards")); requestAnimationFrame(() => document.getElementById("want-to-go")?.scrollIntoView({ block: "center" })); } };
    go(); window.addEventListener("hashchange", go); return () => window.removeEventListener("hashchange", go);
  }, [ready, positionOf]);

  const visible = useMemo(() => new Set((single ? [allPages[idx]] : spreads[idx] ?? []).map(pageKey)), [single, allPages, spreads, idx]);
  const label = useCallback((p: PageSpec): string => {
    switch (p.kind) { case "cover": return tr("Cover"); case "you": return tr("You"); case "zone": { const l = zoneText(p.zone, tr).label; return p.of > 1 ? `${l} ${p.part}/${p.of}` : l; } case "seals": return tr("Endorsements"); case "rewards": return tr("Rewards"); default: return tr("Safe travels"); }
  }, [tr]);
  const shown = (single ? [allPages[idx]] : spreads[idx] ?? []).map(label);
  const announce = useCallback((i: number) => { const names = (single ? [allPages[i]] : spreads[i] ?? []).map(label); setStatus(i === 0 ? tr("The cover. Open the passport to begin.") : tr("Showing {pages}.", { pages: names.join(" · ") })); }, [single, allPages, spreads, label, tr]);
  const go = useCallback((i: number, quiet?: boolean) => { const t = Math.max(0, Math.min(maxIdx, i)); if (t === idx) return; setIdx(t); if (!quiet) announce(t); }, [idx, maxIdx, announce]);

  useEffect(() => { // arrow keys turn the page from anywhere on the page: once a page is turned the button you pressed is no longer reachable, so focus falls back to the page itself
    if (!ready || plain) return;
    const onKey = (e: KeyboardEvent) => { if (openId || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return; if (e.key === "ArrowRight") { go(idx + 1); e.preventDefault(); } else if (e.key === "ArrowLeft") { go(idx - 1); e.preventDefault(); } };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, [ready, plain, openId, idx, go]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { const d = dlg.current; if (!d) return; if (openId) { if (!d.open) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); } } else if (d.open) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } }, [openId]);

  const place = openId ? data.places.find((p) => p.id === openId) ?? null : null;
  const refresh = () => startTransition(() => router.refresh());
  const jumpTo = (p: PassportPlace) => { const key = [...content].find((c) => c.kind === "zone" && c.places.some((x) => x.id === p.id)); if (key) go(positionOf(pageKey(key)), true); };
  const onStamped = (res: CheckinResult, p: PassportPlace) => {
    setOpenId(null); setJust(p.id); jumpTo(p); refresh(); setTimeout(() => setJust(null), 1600);
    const more = res.newBadges && res.newBadges.length ? ` ${tr("New endorsement: {names}.", { names: res.newBadges.join(", ") })}` : "";
    setStatus((res.alreadyCheckedIn ? tr("You have already stamped {name}. No extra points this time.", { name: p.name }) : tr("{name} stamped. {n} points added.", { name: p.name, n: res.pointsAwarded ?? 0 })) + more);
  };
  const onMark = async (p: PassportPlace) => { setOpenId(null); try { await toggleVisit(p.id); refresh(); setStatus(tr("{name} marked as visited. It earns no points until you check in there.", { name: p.name })); } catch { setStatus(tr("Something went wrong. Please try again.")); } };
  const onUnmark = async (p: PassportPlace) => { setOpenId(null); try { await toggleVisit(p.id); refresh(); setStatus(tr("The mark on {name} was removed.", { name: p.name })); } catch { setStatus(tr("Something went wrong. Please try again.")); } };
  const removeWish = async (id: string) => { const w = data.wishes.find((x) => x.id === id); setBusyWish(id); try { await toggleWish(id); refresh(); setStatus(tr("{name} was removed from your list.", { name: w?.name ?? "" })); } catch { setStatus(tr("Something went wrong. Please try again.")); } finally { setBusyWish(null); } };

  const ctx: Ctx = { data, tr, locale, lp, interactive: true, just, uid, busyWish, openPlace: setOpenId, openBook: () => go(1), removeWish };
  const render = (spec: PageSpec, c: Ctx = ctx) => {
    const n = content.findIndex((x) => pageKey(x) === pageKey(spec)) + 1;
    switch (spec.kind) { case "cover": return <CoverPage ctx={c} />; case "you": return <YouPage ctx={c} num={n} />; case "zone": return <ZonePageView ctx={c} page={spec} num={n} />; case "seals": return <SealsPage ctx={c} num={n} />; case "rewards": return <RewardsPage ctx={c} num={n} />; default: return <EndPage ctx={c} num={n} />; }
  };
  const staticCtx: Ctx = { ...ctx, interactive: false };
  const tabs = single ? allPages.map(label) : spreads.map((s) => s.map(label).join(" & "));

  const header = (
    <div className="pp-page-wrap">
      <header className="pp-bar">
        <div><p className="pp-eyebrow">{tr("Taita Passport")}</p><h1>{tr("Your Passport")}</h1><p className="pp-sub">{tr("A passport you can open. Turn the pages, tap a place to see its stamp, or check in when you are there.")}</p></div>
        {ready && (
          <div className="pp-switches" role="group" aria-label={tr("How this page behaves")}>
            <button type="button" className="pp-sw" aria-pressed={motion} onClick={() => { setMotion(!motion); setStatus(!motion ? tr("Page-turn motion is on.") : tr("Page-turn motion is off. Pages change instantly.")); }}><span className="pp-dot" aria-hidden="true" />{tr("Page-turn motion")}</button>
            <button type="button" className="pp-sw" aria-pressed={plain} onClick={() => { setPlain(!plain); setStatus(!plain ? tr("Plain view: every page is listed in order, without the booklet.") : tr("Back to the booklet.")); }}><span className="pp-dot" aria-hidden="true" />{tr("Plain view")}</button>
          </div>
        )}
      </header>
    </div>
  );

  let body: React.ReactNode;
  if (!ready) {
    body = (<><div className="pp-static">{render({ kind: "cover" }, { ...ctx, openBook: () => {} })}</div><noscript><div className="pp-plain">{allPages.map((p) => <section key={pageKey(p)} aria-label={label(p)}>{render(p, staticCtx)}</section>)}</div></noscript></>);
  } else if (plain) {
    body = (<div className="pp-plain">{allPages.map((p) => <section key={pageKey(p)} aria-label={label(p)}>{render(p)}</section>)}</div>);
  } else {
    const flipped = (i: number) => i < idx;
    body = (
      <>
        <div className="pp-book-wrap" onPointerDown={(e) => { if (e.pointerType === "touch") swipe.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={(e) => { const s = swipe.current; swipe.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) go(idx + (dx < 0 ? 1 : -1)); }} onPointerCancel={() => { swipe.current = null; }}>
          <div className={`pp-book${single ? " pp-single" : ""}`} data-s={idx}>
            {single
              ? allPages.map((p, i) => (<div key={pageKey(p)} className={`pp-sheet${flipped(i) ? " pp-flipped" : ""}`} style={{ zIndex: flipped(i) ? 20 + i : allPages.length + 2 - i }}><div className="pp-face pp-front" inert={!visible.has(pageKey(p))} aria-hidden={!visible.has(pageKey(p))}>{render(p)}</div></div>))
              : sheets.map(([front, back], i) => (<div key={pageKey(front)} className={`pp-sheet${flipped(i) ? " pp-flipped" : ""}`} style={{ zIndex: flipped(i) ? 20 + i : sheets.length + 2 - i }}>
                  <div className="pp-face pp-front" inert={!visible.has(pageKey(front))} aria-hidden={!visible.has(pageKey(front))}>{render(front)}</div>
                  {back && <div className="pp-face pp-back" inert={!visible.has(pageKey(back))} aria-hidden={!visible.has(pageKey(back))}>{render(back)}</div>}
                </div>))}
          </div>
        </div>
        <nav className="pp-nav" aria-label={tr("Passport pages")}>
          <button type="button" className="pp-nb" aria-disabled={idx === 0} onClick={() => { if (idx > 0) go(idx - 1); }}>{tr("Previous page")}</button>
          <div className="pp-tabs">{tabs.map((t, i) => <button key={i} type="button" className="pp-tab" aria-current={i === idx} onClick={() => go(i)}>{t}</button>)}</div>
          <button type="button" className="pp-nb" aria-disabled={idx === maxIdx} onClick={() => { if (idx < maxIdx) go(idx + 1); }}>{tr("Next page")}</button>
        </nav>
      </>
    );
  }
  void shown;

  return (
    <div className="pp-root" data-motion={motion ? "on" : "off"}>
      <InkFilter />
      {header}
      <section className="pp-page-wrap" aria-label={tr("Your Taita Passport")}>
        {body}
        <p className="pp-status" role="status" aria-live="polite">{status}</p>
      </section>
      <dialog ref={dlg} className="pp-dlg" aria-labelledby="pp-dlg-title" onClose={() => setOpenId(null)} onClick={(e) => { if (e.target === dlg.current) setOpenId(null); }}>
        {place && <PlaceSheet key={place.id} place={place} tr={tr} locale={locale} onClose={() => setOpenId(null)} onStamped={onStamped} onMark={onMark} onUnmark={onUnmark} />}
      </dialog>
    </div>
  );
}
