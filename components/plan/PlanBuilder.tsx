"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { savePlan } from "@/lib/actions/plan";
import { MAX_NOTE, MAX_PARTY, MAX_STOPS, MAX_TITLE, checkPlan, dayLabel, estimateTotal, keyOf, orderStops, parseTime, timeLabel, validatePlanInput, type Stop, type StopInfo, type StopKind } from "@/lib/plan";
import { formatPrice } from "@/lib/format";
import ScrollFade from "@/components/ui/ScrollFade";

type Catalogue = {
  day: string;
  experiences: { id: string; name: string; region: string; durationMin: number | null; price: number | null; latitude: number | null; longitude: number | null; sessions: { id: string; minutes: number; spots: number }[] }[];
  events: { id: string; name: string; region: string; minutes: number; price: number | null; free: boolean }[];
  stays: { id: string; name: string; region: string; price: number | null; latitude: number | null; longitude: number | null }[];
  places: { id: string; name: string; region: string; latitude: number | null; longitude: number | null; altitudeM: number | null }[];
};
type Item = Stop & { name: string; region: string; info: StopInfo };
const DRAFT = "taita-plan-draft";
const TABS: { kind: StopKind; label: string }[] = [{ kind: "EXPERIENCE", label: "Experiences" }, { kind: "EVENT", label: "Events" }, { kind: "STAY", label: "Stays" }, { kind: "PLACE", label: "Places" }];
const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment", off = "border-stone/30 text-stone hover:border-stone";
const label = "font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-stone/75";
const btn = "focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-stone px-4 font-body text-[0.72rem] font-bold uppercase tracking-[0.16em] text-stone hover:bg-stone hover:text-parchment";

export default function PlanBuilder({ defaultDay, minDay, maxDay }: { defaultDay: string; minDay: string; maxDay: string }) {
  const [day, setDay] = useState(defaultDay);
  const [party, setParty] = useState(2);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<StopKind>("EXPERIENCE");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // A draft is kept in this browser tab, so a person can sign in and come back to it.
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null");
      if (d && validatePlanInput({ title: d.title, day: d.day, partySize: d.party, stops: (d.items ?? []).map((x: Item) => ({ kind: x.kind, refId: x.refId, sessionId: x.sessionId, startMinutes: x.startMinutes, note: x.note })) }, new Date()).ok && Array.isArray(d.items)) {
        setDay(d.day); setParty(d.party); setTitle(typeof d.title === "string" ? d.title.slice(0, MAX_TITLE) : ""); setItems(d.items.filter((x: Item) => x && typeof x.name === "string" && x.info));
      }
    } catch { /* an unreadable draft is ignored */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { sessionStorage.setItem(DRAFT, JSON.stringify({ day, party, title, items })); } catch { /* storage may be unavailable */ } } }, [ready, day, party, title, items]);

  // What can go in the plan for this day.
  useEffect(() => {
    if (!ready) return; let off = false; setLoading(true); setLoadError(null);
    fetch(`/api/plan/catalogue?day=${encodeURIComponent(day)}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error ?? "Couldn't load that day."); return j as Catalogue; })
      .then((j) => { if (!off) { setCat(j); setLoading(false); } })
      .catch((e) => { if (!off) { setCat(null); setLoading(false); setLoadError(e instanceof Error ? e.message : "Couldn't load that day."); } });
    return () => { off = true; };
  }, [ready, day]);

  const changeDay = (d: string) => {
    if (d === day || !d) return;
    // Sessions and events belong to one day: they are taken out when the day changes.
    const keep = items.filter((i) => i.kind === "STAY" || i.kind === "PLACE" || (i.kind === "EXPERIENCE" && !i.sessionId));
    setNotice(keep.length < items.length ? `${items.length - keep.length} ${items.length - keep.length === 1 ? "stop belongs" : "stops belong"} to ${dayLabel(day)} and ${items.length - keep.length === 1 ? "was" : "were"} taken out.` : null);
    setItems(keep); setDay(d);
  };
  const add = (it: Item) => setItems((cur) => (cur.some((c) => keyOf(c) === keyOf(it)) ? cur : [...(it.kind === "STAY" ? cur.filter((c) => c.kind !== "STAY") : cur), it]));
  const remove = (k: string) => setItems((cur) => cur.filter((c) => keyOf(c) !== k));
  const patch = (k: string, p: Partial<Item>) => setItems((cur) => cur.map((c) => (keyOf(c) === k ? { ...c, ...p } : c)));

  const stops: Stop[] = items; const info = useMemo(() => new Map(items.map((i) => [keyOf(i), i.info])), [items]);
  const ordered = useMemo(() => orderStops(items), [items]);
  const { errors, warnings } = useMemo(() => checkPlan(stops, info), [stops, info]);
  const total = useMemo(() => estimateTotal(stops, info, party), [stops, info, party]);

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const r = await savePlan({ title, day, partySize: party, stops: items.map(({ kind, refId, sessionId, startMinutes, note }) => ({ kind, refId, sessionId: sessionId ?? null, startMinutes: startMinutes ?? null, note: note ?? null })) });
      if (r.ok) { try { sessionStorage.removeItem(DRAFT); } catch { /* fine */ } window.location.assign(`/plan/${r.token}`); return; }
      setSaveError(r.error);
    } catch { setSaveError("Couldn't save that. Please check your connection and try again."); }
    setSaving(false);
  };

  const inPlan = (kind: StopKind, id: string) => items.some((i) => i.kind === kind && i.refId === id);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <div><label htmlFor="plan-day" className={label}>Which day?</label><input id="plan-day" type="date" min={minDay} max={maxDay} value={day} onChange={(e) => changeDay(e.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-[2px] border border-stone/30 bg-transparent px-3.5 font-body text-sm text-stone" /><p className="mt-1 font-body text-xs text-stone/75">{dayLabel(day)}</p></div>
          <div><label htmlFor="plan-party" className={label}>How many people?</label><input id="plan-party" type="number" min={1} max={MAX_PARTY} step={1} value={party} onChange={(e) => setParty(Math.min(MAX_PARTY, Math.max(1, Math.floor(Number(e.target.value)) || 1)))} className="mt-1.5 min-h-[44px] w-full rounded-[2px] border border-stone/30 bg-transparent px-3.5 font-body text-sm text-stone" /></div>
        </div>
        {notice && <p role="status" className="mt-4 font-body text-sm text-stone">{notice}</p>}

        <h2 className="mt-10 font-display text-3xl text-stone">What would you like to do?</h2>
        <ScrollFade as="div" role="group" aria-label="Kind of stop" className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1">
          {TABS.map((t) => <button key={t.kind} type="button" aria-pressed={tab === t.kind} onClick={() => setTab(t.kind)} className={`${chip} ${tab === t.kind ? on : off}`}>{t.label}</button>)}
        </ScrollFade>
        <div className="mt-5 min-h-[8rem]" aria-live="polite">
          {loading && <p className="font-body text-sm text-stone/75">Loading what is on that day…</p>}
          {loadError && <p role="alert" className="font-body text-sm font-semibold text-rust-deep">{loadError}</p>}
          {cat && !loading && (
            <ul className="flex flex-col divide-y divide-stone/10 border-y border-stone/10">
              {tab === "EXPERIENCE" && (cat.experiences.length === 0 ? <li className="py-5 font-body text-sm text-stone/75">No experiences have open sessions on this day.</li> : cat.experiences.map((x) => {
                const chosen = pick[x.id] ?? x.sessions[0]?.id; const s = x.sessions.find((q) => q.id === chosen) ?? x.sessions[0];
                return (<li key={x.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display text-lg text-stone">{x.name}</p><p className="font-body text-sm text-stone/80">{x.region}{x.price != null ? ` · from ${formatPrice(x.price)} each` : ""}</p></div>
                  <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`s-${x.id}`}>Session for {x.name}</label><select id={`s-${x.id}`} value={chosen} onChange={(e) => setPick((p) => ({ ...p, [x.id]: e.target.value }))} className="min-h-[44px] rounded-[2px] border border-stone/30 bg-transparent px-3 font-body text-sm text-stone">{x.sessions.map((q) => <option key={q.id} value={q.id}>{timeLabel(q.minutes)} · {q.spots} {q.spots === 1 ? "spot" : "spots"} left</option>)}</select>
                    <button type="button" disabled={inPlan("EXPERIENCE", x.id) || items.length >= MAX_STOPS} onClick={() => add({ kind: "EXPERIENCE", refId: x.id, sessionId: s.id, startMinutes: s.minutes, note: null, name: x.name, region: x.region, info: { name: x.name, durationMin: x.durationMin, latitude: x.latitude, longitude: x.longitude, price: x.price } })} className={`${btn} disabled:opacity-50`}>{inPlan("EXPERIENCE", x.id) ? "Added" : "Add"}<span className="sr-only"> {x.name}</span></button></div></li>);
              }))}
              {tab === "EVENT" && (cat.events.length === 0 ? <li className="py-5 font-body text-sm text-stone/75">No events on this day.</li> : cat.events.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display text-lg text-stone">{x.name}</p><p className="font-body text-sm text-stone/80">{timeLabel(x.minutes)} · {x.region}{x.free ? " · Free" : x.price != null ? ` · ${formatPrice(x.price)}` : ""}</p></div>
                  <button type="button" disabled={inPlan("EVENT", x.id) || items.length >= MAX_STOPS} onClick={() => add({ kind: "EVENT", refId: x.id, sessionId: null, startMinutes: x.minutes, note: null, name: x.name, region: x.region, info: { name: x.name, price: x.price, free: x.free } })} className={`${btn} disabled:opacity-50`}>{inPlan("EVENT", x.id) ? "Added" : "Add"}<span className="sr-only"> {x.name}</span></button></li>
              )))}
              {tab === "STAY" && (cat.stays.length === 0 ? <li className="py-5 font-body text-sm text-stone/75">No stays listed yet.</li> : cat.stays.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display text-lg text-stone">{x.name}</p><p className="font-body text-sm text-stone/80">{x.region}{x.price != null ? ` · from ${formatPrice(x.price)} a night` : ""}</p></div>
                  <button type="button" disabled={inPlan("STAY", x.id)} onClick={() => add({ kind: "STAY", refId: x.id, sessionId: null, startMinutes: null, note: null, name: x.name, region: x.region, info: { name: x.name, price: x.price, latitude: x.latitude, longitude: x.longitude } })} className={`${btn} disabled:opacity-50`}>{inPlan("STAY", x.id) ? "Added" : items.some((i) => i.kind === "STAY") ? "Use instead" : "Add"}<span className="sr-only"> {x.name}</span></button></li>
              )))}
              {tab === "PLACE" && (cat.places.length === 0 ? <li className="py-5 font-body text-sm text-stone/75">No places listed yet.</li> : cat.places.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display text-lg text-stone">{x.name}</p><p className="font-body text-sm text-stone/80">{x.region}{x.altitudeM != null ? ` · ${x.altitudeM.toLocaleString("en-KE")} m` : ""}</p></div>
                  <button type="button" disabled={inPlan("PLACE", x.id) || items.length >= MAX_STOPS} onClick={() => add({ kind: "PLACE", refId: x.id, sessionId: null, startMinutes: null, note: null, name: x.name, region: x.region, info: { name: x.name, latitude: x.latitude, longitude: x.longitude } })} className={`${btn} disabled:opacity-50`}>{inPlan("PLACE", x.id) ? "Added" : "Add"}<span className="sr-only"> {x.name}</span></button></li>
              )))}
            </ul>
          )}
        </div>
      </div>

      <aside aria-labelledby="your-day" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[2px] border-2 border-stone p-5">
          <h2 id="your-day" className="font-body text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-stone">Your day</h2>
          <hr className="mb-4 mt-2 h-[5px] border-0 bg-stone" />
          <label htmlFor="plan-title" className={label}>Name it (optional)</label>
          <input id="plan-title" value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} placeholder="My Taita day" className="mt-1.5 min-h-[44px] w-full rounded-[2px] border border-stone/30 bg-transparent px-3.5 font-body text-sm text-stone placeholder:text-stone/80" />
          {ordered.length === 0 ? <p className="mt-5 font-body text-sm text-stone/80">Nothing yet. Add something from the left.</p> : (
            <ol className="mt-5 flex flex-col gap-4">
              {ordered.map((i) => {
                const k = keyOf(i); const fixed = i.kind === "EVENT" || (i.kind === "EXPERIENCE" && !!i.sessionId);
                return (
                  <li key={k} className="border-b border-stone/10 pb-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-stone/75">{i.kind === "STAY" ? "Overnight" : typeof i.startMinutes === "number" ? timeLabel(i.startMinutes) : "Any time"}</p><p className="font-display text-lg leading-snug text-stone">{i.name}</p></div>
                      <button type="button" onClick={() => remove(k)} className="focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center font-body text-sm text-rust-deep underline underline-offset-4">Remove<span className="sr-only"> {i.name}</span></button></div>
                    {!fixed && i.kind !== "STAY" && <div className="mt-2"><label className="font-body text-xs text-stone/80" htmlFor={`t-${k}`}>Start time (optional)</label><input id={`t-${k}`} type="time" value={typeof i.startMinutes === "number" ? timeLabel(i.startMinutes) : ""} onChange={(e) => patch(k, { startMinutes: parseTime(e.target.value) })} className="ml-2 min-h-[44px] rounded-[2px] border border-stone/30 bg-transparent px-2 font-body text-sm text-stone" /></div>}
                    <label className="mt-2 block font-body text-xs text-stone/80" htmlFor={`n-${k}`}>Note (optional)</label><input id={`n-${k}`} value={i.note ?? ""} maxLength={MAX_NOTE} onChange={(e) => patch(k, { note: e.target.value || null })} className="mt-1 min-h-[44px] w-full rounded-[2px] border border-stone/30 bg-transparent px-3 font-body text-sm text-stone" />
                  </li>
                );
              })}
            </ol>
          )}
          <div aria-live="polite">
            {warnings.length > 0 && <div className="mt-4 rounded-[2px] border border-ochre/60 bg-ochre/10 p-3"><p className="font-body text-sm font-bold text-stone">Worth a look</p><ul className="mt-1 list-disc pl-5 font-body text-sm text-stone/90">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          </div>
          <p className="mt-5 font-display text-3xl text-stone">{formatPrice(total.total)}<span className="font-body text-sm text-stone/75"> for {party} {party === 1 ? "person" : "people"}</span></p>
          <p className="mt-1 font-body text-xs text-stone/80">A rough total from listed prices{total.unpriced > 0 ? `; ${total.unpriced} without a price not counted` : ""}. <b>Nothing is booked or paid</b> by saving a plan.</p>
          {errors.length > 0 && items.length > 0 && <p role="alert" className="mt-3 font-body text-sm font-semibold text-rust-deep">{errors[0]}</p>}
          <button type="button" onClick={save} disabled={saving || items.length === 0 || errors.length > 0} className="focus-ring mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-[2px] bg-rust px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment hover:bg-rust-deep disabled:opacity-50">{saving ? "Saving…" : "Save and share"}</button>
          {saveError && <p role="alert" className="mt-3 font-body text-sm font-semibold text-rust-deep">{saveError}{/sign in/i.test(saveError) && <> <Link href="/login" className="focus-ring underline underline-offset-4">Sign in</Link>: your plan stays on this screen.</>}</p>}
        </div>
      </aside>
    </div>
  );
}
