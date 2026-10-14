"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { COPY, RULES, STORAGE_KEY, ZONE_CHOICES, canShow, dayChoices, isExcluded, pickVariant, readMemory, remember, scrollUp, mouseExit, variantOrder, type Event, type Memory, type SessionState, type Variant } from "@/lib/concierge";
import { suggestDay, toDraft, type Catalogue, type Pref, type Suggestion } from "@/lib/concierge-plan";
import { dayLabel, timeLabel } from "@/lib/plan";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { T } from "@/lib/i18n/mark";

const SESSION_KEY = "taita-concierge-session"; const PLAN_DRAFT = "taita-plan-draft";
/** Where the guide sends the browser (a seam, so tests can see the destination without leaving the page). */
export const nav = { to: (url: string) => { window.location.assign(url); } };
const btn = "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-[2px] px-5 font-body text-[0.75rem] font-bold uppercase tracking-[0.16em]";
const primary = `${btn} bg-rust text-parchment hover:bg-rust-deep disabled:opacity-50`, ghost = `${btn} border border-stone text-stone hover:bg-stone hover:text-parchment`;
const chip = "focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment", off = "border-stone/30 text-stone hover:border-stone";
const label = "font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-stone/75";

const load = (k: string, store: Storage | undefined) => { try { return store?.getItem(k) ?? null; } catch { return null; } };
const save = (k: string, v: string, store: Storage | undefined) => { try { store?.setItem(k, v); } catch { /* storage may be off: then the cool-down simply can't be remembered */ } };

/** NEXT_PUBLIC_CONCIERGE_OFF=1 switches the whole guide off (set it in the hosting settings and redeploy). */
export default function Concierge() {
  if (process.env.NEXT_PUBLIC_CONCIERGE_OFF === "1") return null;
  return <Guide />;
}

function Guide() {
  const { tr, lp } = useI18n();
  const pathname = usePathname() ?? "/"; const titleId = useId(); const dlg = useRef<HTMLDialogElement>(null); const back = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false); const [view, setView] = useState<Variant>("plan"); const [auto, setAuto] = useState(false); const [ai, setAi] = useState(false); const [ready, setReady] = useState(false);
  const mem = useRef<Memory>({ shownAt: [], dismissedAt: null, optOutUntil: null, actedAt: null }); const sess = useRef<SessionState>({ pageViews: 0, startedAt: Date.now(), maxScroll: 0, shown: false }); const acted = useRef(false);
  const excluded = isExcluded(pathname);

  const note = useCallback((e: Event) => { mem.current = remember(mem.current, e, Date.now()); save(STORAGE_KEY, JSON.stringify(mem.current), globalThis.localStorage); }, []);
  const saveSession = () => save(SESSION_KEY, JSON.stringify(sess.current), globalThis.sessionStorage);

  // What this browser remembers, and which page this is.
  useEffect(() => {
    mem.current = readMemory(load(STORAGE_KEY, globalThis.localStorage));
    try { const o = JSON.parse(load(SESSION_KEY, globalThis.sessionStorage) ?? "null"); if (o && typeof o.startedAt === "number") sess.current = { pageViews: Number(o.pageViews) || 0, startedAt: o.startedAt, maxScroll: Number(o.maxScroll) || 0, shown: !!o.shown }; } catch { /* a fresh visit */ }
    setReady(true);
    fetch("/api/concierge/capabilities").then((r) => r.json()).then((j) => setAi(j?.ai === true)).catch(() => setAi(false));
  }, []);
  useEffect(() => { if (!ready) return; sess.current.pageViews += 1; saveSession(); }, [pathname, ready]);

  const show = useCallback((v: Variant, byTrigger: boolean) => {
    back.current = (document.activeElement as HTMLElement) ?? null; acted.current = false; setView(v); setAuto(byTrigger); setOpen(true);
    if (byTrigger) { sess.current.shown = true; saveSession(); note("shown"); }
  }, [note]);

  // When to offer: leaving with a mouse, scrolling back up fast, or going quiet on a phone. Never early, never twice, never on excluded pages.
  useEffect(() => {
    if (!ready || excluded || open) return;
    const fire = () => { if (canShow({ path: pathname, memory: mem.current, session: sess.current, now: Date.now() }).ok) show(pickVariant(pathname, ai), true); };
    const fine = globalThis.matchMedia?.("(hover: hover) and (pointer: fine)").matches; let prevY: number | null = null; const trail: { y: number; t: number }[] = []; let idle: ReturnType<typeof setTimeout> | undefined;
    const arm = () => { clearTimeout(idle); if (!fine) idle = setTimeout(fire, RULES.idleMs); };
    const move = (e: MouseEvent) => { prevY = e.clientY; }; const out = (e: MouseEvent) => { if (fine && mouseExit(e, prevY)) fire(); };
    const scroll = () => {
      const vh = innerHeight, doc = document.documentElement.scrollHeight, y = scrollY, now = Date.now();
      sess.current.maxScroll = Math.max(sess.current.maxScroll, doc > 0 ? (y + vh) / doc : 0); trail.push({ y, t: now }); while (trail.length && now - trail[0].t > RULES.scrollUpWindowMs) trail.shift();
      const peak = trail.reduce((a, b) => (b.y > a.y ? b : a), trail[0]); if (!fine && scrollUp({ fromY: peak.y, toY: y, ms: now - peak.t, maxDepth: sess.current.maxScroll, viewport: vh })) fire(); arm();
    };
    document.addEventListener("mousemove", move, { passive: true }); document.addEventListener("mouseout", out); addEventListener("scroll", scroll, { passive: true }); addEventListener("touchstart", arm, { passive: true }); addEventListener("keydown", arm); arm();
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseout", out); removeEventListener("scroll", scroll); removeEventListener("touchstart", arm); removeEventListener("keydown", arm); clearTimeout(idle); };
  }, [ready, excluded, open, pathname, ai, show]);

  // Anything on the page marked data-concierge-open="plan" (or maker, surprise, ask) opens it on request.
  useEffect(() => { const h = (e: MouseEvent) => { const el = (e.target as HTMLElement)?.closest?.("[data-concierge-open]") as HTMLElement | null; const v = el?.getAttribute("data-concierge-open") as Variant | null; if (v) { e.preventDefault(); show(v === "ask" && !ai ? "plan" : v, false); } }; document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [show, ai]);

  // The native dialog gives focus trapping, Escape and a blocked background; we add where focus goes first and where it returns.
  useEffect(() => { const d = dlg.current; if (!d) return; if (open && !d.open) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); d.querySelector<HTMLElement>("[data-first]")?.focus(); } if (!open && d.open) d.close?.(); }, [open]);
  const onClose = useCallback(() => {
    setOpen(false); if (auto && !acted.current) note("dismissed");
    // Focus goes back to where it was. If that was the launcher (which is removed while the dialog is open), to the launcher once it is back.
    const was = back.current; setTimeout(() => { const el = was && document.contains(was) ? was : document.querySelector<HTMLElement>("[data-concierge-launcher]"); el?.focus?.(); }, 0);
  }, [auto, note]);
  const close = () => { const d = dlg.current; if (d?.close) d.close(); else onClose(); };
  const didAct = () => { acted.current = true; note("acted"); };

  const order = variantOrder(view, ai); const copy = COPY[view];
  return (
    <>
      {ready && !excluded && !open && (
        <button type="button" onClick={() => show(pickVariant(pathname, ai), false)} data-concierge-launcher className="focus-ring fixed bottom-4 left-4 z-40 flex min-h-[48px] items-center gap-2 rounded-full bg-stone px-4 font-body text-sm font-semibold text-parchment shadow-lg hover:bg-rust-deep print:hidden" aria-label={tr("Plan my day or ask Taita")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l5-9 4 5 3-4 4 8z" /><circle cx="17" cy="6" r="1.6" /></svg>
          <span className="hidden sm:inline">{tr("Plan my day")}</span>
        </button>
      )}
      <dialog ref={dlg} aria-labelledby={titleId} onClose={onClose} onClick={(e) => { if (e.target === dlg.current) close(); }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88vh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-parchment p-0 text-stone shadow-2xl backdrop:bg-stone/60 sm:inset-0 sm:m-auto sm:max-w-xl sm:rounded-[3px]">
        {open && (
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">{tr("Taita Guide")}</p>
              <button type="button" onClick={close} className="focus-ring -mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center font-body text-sm font-semibold underline underline-offset-4" data-first>{tr("Close")}<span className="sr-only">{" "}{tr("the guide")}</span></button>
            </div>
            <h2 id={titleId} className="mt-2 font-display text-[1.45rem] font-medium leading-tight sm:text-[1.7rem]">{tr(copy.title)}</h2>
            <p className="mt-1.5 max-w-md font-body text-sm text-stone/85">{tr(copy.body)}</p>
            <div role="group" aria-label={tr("What would help?")} className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1">
              {order.map((v) => <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)} className={`${chip} shrink-0 ${v === view ? on : off}`}>{tr(COPY[v].tab)}</button>)}
            </div>
            <div className="mt-5">
              {view === "plan" && <PlanView pathname={pathname} onAct={didAct} />}
              {view === "maker" && <MakerView onAct={didAct} />}
              {view === "surprise" && <SurpriseView onAct={didAct} />}
              {view === "ask" && <AskView onAct={didAct} />}
            </div>
            {auto && <div className="mt-1"><button type="button" onClick={() => { note("optout"); acted.current = true; close(); }} className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm text-stone/80 underline underline-offset-4">{tr("Don't show this again")}</button></div>}
          </div>
        )}
      </dialog>
    </>
  );
}

// ---- Plan my day ---------------------------------------------------------------------------------------------------------------------
function PlanView({ pathname, onAct }: { pathname: string; onAct: () => void }) {
  const { tr, lp } = useI18n();
  const days = dayChoices(new Date()); const [zone, setZone] = useState<Pref>("HIGHLANDS"); const [day, setDay] = useState(days[0].day); const [party, setParty] = useState(2);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [cat, setCat] = useState<Catalogue | null>(null); const [seed, setSeed] = useState(0); const [anchor, setAnchor] = useState<{ id: string; name: string } | null>(null); const [made, setMade] = useState(false);
  useEffect(() => { const m = /^\/stories\/([a-z0-9-]+)\/?$/.exec(pathname); if (!m) return; let off = false; fetch(`/api/concierge/story?slug=${m[1]}`).then((r) => r.json()).then((j) => { if (!off && j?.place?.id) setAnchor(j.place); }).catch(() => {}); return () => { off = true; }; }, [pathname]);
  const result: Suggestion | null = made && cat ? suggestDay(cat, { zone, party, seed, anchorPlaceId: anchor?.id }) : null;
  const go = async (nextSeed = 0) => {
    setBusy(true); setErr(null);
    try { const r = await fetch(`/api/plan/catalogue?day=${encodeURIComponent(day)}`); const j = await r.json(); if (!r.ok) throw new Error(j?.error ?? tr("Couldn't load that day.")); setCat(j as Catalogue); setSeed(nextSeed); setMade(true); }
    catch (e) { setErr(e instanceof Error ? e.message : tr("Couldn't load that day.")); } finally { setBusy(false); }
  };
  const open = () => { if (!result) return; onAct(); try { sessionStorage.setItem(PLAN_DRAFT, JSON.stringify(toDraft(day, party, result.items))); } catch { /* the planner then simply starts empty */ } nav.to(lp("/plan")); };
  if (made && result) {
    return (
      <div>
        <p className={label}>{dayLabel(day)} · {party} {party === 1 ? tr("person") : tr("people")}{anchor ? ` · ${tr("includes {name}", { name: anchor.name })}` : ""}</p>
        {result.items.length > 0 ? (
          <ol className="mt-3 border-l-2 border-stone/20">
            {result.items.map((i) => (
              <li key={`${i.kind}:${i.refId}`} className="relative pb-4 pl-5"><span aria-hidden="true" className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-rust" />
                <p className="font-body text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone/75">{i.kind === "STAY" ? tr("Overnight") : typeof i.startMinutes === "number" ? timeLabel(i.startMinutes) : tr("Any time")}</p>
                <p className="font-display text-lg leading-snug">{i.name}</p><p className="font-body text-xs text-stone/75">{i.region}</p></li>
            ))}
          </ol>
        ) : <p className="mt-3 font-body text-sm text-stone/85">{result.reasons[0]}</p>}
        {result.items.length > 0 && <p className="mt-1 font-body text-sm font-semibold">{formatPrice(result.total)} <span className="font-normal text-stone/75">{tr("roughly")}{result.unpriced > 0 ? tr(", {n} without a price", { n: result.unpriced }) : ""}</span></p>}
        {result.items.length > 0 && <details className="mt-3 font-body text-sm text-stone/85"><summary className="focus-ring cursor-pointer font-semibold underline underline-offset-4">{tr("Why these?")}</summary><ul className="mt-2 list-disc pl-5">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul></details>}
        <p className="mt-3 font-body text-xs text-stone/75">{tr("A starting point.")}{" "}<b>{tr("Nothing is booked.")}</b>{" "}{tr("Change anything in the planner.")}</p>
        <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap gap-3 border-t border-stone/15 bg-parchment px-5 py-3 sm:-mx-7 sm:px-7">
          {result.items.length > 0 && <button type="button" onClick={open} className={primary}>{tr("Open in the planner")}</button>}
          <button type="button" onClick={() => setSeed((s) => s + 1)} className={`${ghost} !px-3`} disabled={result.items.length === 0}>{tr("Shuffle")}</button>
          <button type="button" onClick={() => setMade(false)} className={`${ghost} !px-3`}>{tr("Change")}</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <fieldset><legend className={label}>{tr("How high do you want to be?")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {ZONE_CHOICES.map((z) => <button key={z.zone} type="button" aria-pressed={zone === z.zone} onClick={() => setZone(z.zone)} className={`${chip} h-auto w-full flex-col items-start justify-start py-2.5 text-left ${zone === z.zone ? on : off}`}><span className="text-left text-sm">{tr(z.label)}</span><span className={`mt-0.5 text-left text-xs font-normal leading-snug ${zone === z.zone ? "text-parchment/85" : "text-stone/80"}`}>{tr(z.feel)}</span></button>)}
        </div>
        <button type="button" aria-pressed={zone === "ANY"} onClick={() => setZone("ANY")} className={`${chip} mt-2 ${zone === "ANY" ? on : off}`}>{tr("Surprise me: any height")}</button>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <fieldset><legend className={label}>{tr("Which day?")}</legend><div className="mt-2 flex flex-wrap gap-2">{days.map((d) => <button key={d.day} type="button" aria-pressed={day === d.day} onClick={() => setDay(d.day)} className={`${chip} ${day === d.day ? on : off}`}>{tr(d.label)}</button>)}</div></fieldset>
        <div><label htmlFor="cg-party" className={label}>{tr("People")}</label><select id="cg-party" value={party} onChange={(e) => setParty(Number(e.target.value))} className="mt-2 block min-h-[44px] rounded-[2px] border border-stone/30 bg-transparent px-3 font-body text-sm">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
      </div>
      {err && <p role="alert" className="mt-4 font-body text-sm font-semibold text-rust-deep">{err}</p>}
      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-stone/15 bg-parchment px-5 py-3 sm:-mx-7 sm:px-7"><button type="button" onClick={() => go(0)} disabled={busy} className={primary}>{busy ? tr("Looking…") : tr("Plan my day")}</button></div>
    </div>
  );
}

// ---- Meet a maker -------------------------------------------------------------------------------------------------------------------
function MakerView({ onAct }: { onAct: () => void }) {
  const { tr, lp } = useI18n();
  const [f, setF] = useState<{ maker: { slug: string; name: string; craft: string; village: string; altitudeM: number | null } | null; product: { slug: string; name: string; price: number; image: string } | null } | null | "error">(null);
  useEffect(() => { let off = false; fetch("/api/concierge/feature").then((r) => r.json()).then((j) => { if (!off) setF(j); }).catch(() => { if (!off) setF("error"); }); return () => { off = true; }; }, []);
  if (f === null) return <p className="font-body text-sm text-stone/75">{tr("Looking…")}</p>;
  if (f === "error" || !f.maker) return <div><p className="font-body text-sm text-stone/85">{tr("The makers are getting ready. Have a look at the shop in the meantime.")}</p><div className="mt-4"><Link href={lp("/shop")} onClick={onAct} className={primary}>{tr("Browse the shop")}</Link></div></div>;
  return (
    <div>
      <p className={label}>{tr("Maker of the month")}</p><p className="mt-1 font-display text-2xl">{f.maker.name}</p><p className="font-body text-sm text-stone/80">{f.maker.craft} · {f.maker.village}{f.maker.altitudeM != null ? ` · ${f.maker.altitudeM.toLocaleString("en-KE")} m` : ""}</p>
      {f.product && <p className="mt-3 font-body text-sm">{tr("Try")}{" "}<b>{f.product.name}</b>, {formatPrice(f.product.price)}.</p>}
      <div className="mt-5 flex flex-wrap gap-3"><Link href={lp(`/shop/makers/${f.maker.slug}`)} onClick={onAct} className={primary}>{tr("Meet {name}", { name: f.maker.name.split(" ")[0] })}</Link><Link href={lp("/shop")} onClick={onAct} className={ghost}>{tr("Browse the shop")}</Link></div>
    </div>
  );
}

// ---- Surprise me --------------------------------------------------------------------------------------------------------------------
function SurpriseView({ onAct }: { onAct: () => void }) {
  const { tr, lp } = useI18n();
  return <div className="flex flex-wrap gap-3"><a href={lp("/discover/surprise")} onClick={onAct} className={primary}>{tr("Surprise me")}</a><Link href={lp("/map")} onClick={onAct} className={ghost}>{tr("Open the map")}</Link></div>;
}

// ---- Ask Taita ----------------------------------------------------------------------------------------------------------------------
type Turn = { role: "user" | "assistant"; content: string; links?: { label: string; href: string }[] };
const STARTERS = [T("Where can I see hippos?"), T("What is there to do in Wundanyi?"), T("Tell me about the Man-Eaters of Tsavo")];
function AskView({ onAct }: { onAct: () => void }) {
  const { tr, lp } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [turns, busy]);
  const send = async (q: string) => {
    const question = q.trim(); if (!question || busy) return; setErr(null); const next: Turn[] = [...turns, { role: "user", content: question }]; setTurns(next); setText(""); setBusy(true);
    try {
      const r = await fetch("/api/concierge/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8).map(({ role, content }) => ({ role, content })) }) }); const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? tr("The guide couldn't answer just now.")); setTurns([...next, { role: "assistant", content: String(j.reply), links: Array.isArray(j.links) ? j.links : [] }]);
    } catch (e) { setErr(e instanceof Error ? e.message : tr("The guide couldn't answer just now.")); } finally { setBusy(false); }
  };
  return (
    <div>
      <p className="rounded-[2px] border border-stone/20 bg-[#F4EDDC] p-3 font-body text-xs text-stone/85">{tr("Answers come from an AI that reads Visit Taita's own pages. It can be wrong, so please check details with the host.")}{" "}<b>{tr("Don't share personal information.")}</b>{" "}{tr("Nothing you type is saved.")}</p>
      <div className="mt-4 max-h-[40vh] overflow-y-auto" role="log" aria-live="polite" aria-label={tr("Conversation")}>
        {turns.length === 0 && <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} type="button" onClick={() => send(tr(s))} className={`${chip} ${off}`}>{tr(s)}</button>)}</div>}
        {turns.map((t, i) => (
          <div key={i} className={`mt-3 ${t.role === "user" ? "text-right" : ""}`}>
            <p className={`inline-block max-w-[92%] rounded-[3px] px-3 py-2 text-left font-body text-sm ${t.role === "user" ? "bg-stone text-parchment" : "border border-stone/20 bg-[#F4EDDC]"}`}><span className="sr-only">{t.role === "user" ? tr("You") : tr("Taita Guide")}{": "}</span>{t.content}</p>
            {t.links && t.links.length > 0 && <p className="mt-1 flex flex-wrap gap-x-4 font-body text-sm">{t.links.map((l) => <Link key={l.href} href={l.href} onClick={onAct} className="focus-ring inline-flex min-h-[44px] items-center font-semibold text-rust-deep underline underline-offset-4">{l.label}</Link>)}</p>}
          </div>
        ))}
        {busy && <p className="mt-3 font-body text-sm text-stone/75">{tr("Thinking…")}</p>}<div ref={end} />
      </div>
      {err && <p role="alert" className="mt-3 font-body text-sm font-semibold text-rust-deep">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-4 flex gap-2">
        <label htmlFor="cg-ask" className="sr-only">{tr("Your question")}</label>
        <input id="cg-ask" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder={tr("Ask about Taita")} className="min-h-[44px] flex-1 rounded-[2px] border border-stone/30 bg-transparent px-3 font-body text-sm placeholder:text-stone/80" />
        <button type="submit" disabled={busy || !text.trim()} className={primary}>{tr("Ask")}</button>
      </form>
    </div>
  );
}
