// Sideways-scrolling rows: where the row is, what is hidden, and what to tell the person. Pure functions: no browser needed.
export type Edges = { overflow: boolean; atStart: boolean; atEnd: boolean; progress: number; thumb: number };
export const NO_EDGES: Edges = { overflow: false, atStart: true, atEnd: true, progress: 0, thumb: 1 };
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** From a row's scroll position and sizes: is anything hidden, are we at either end, how far along (0 to 1), and how big the "you are here" thumb is. */
export function edgeState(m: { scrollLeft: number; clientWidth: number; scrollWidth: number }, tolerance = 8): Edges {
  const left = num(m.scrollLeft), view = num(m.clientWidth), whole = num(m.scrollWidth);
  const max = Math.max(0, whole - view); const overflow = max > 1;
  if (!overflow) return NO_EDGES;
  return { overflow, atStart: left <= tolerance, atEnd: left >= max - tolerance, progress: clamp(left / max, 0, 1), thumb: clamp(view / whole, 0.12, 1) };
}

/** Which item to call "current" (0-based): the first one whose middle is still in view; the last one once the row has reached its end. */
export function activeIndex(items: { left: number; width: number }[], scrollLeft: number, atEnd: boolean): number {
  if (items.length === 0) return 0; if (atEnd) return items.length - 1;
  const s = num(scrollLeft); const i = items.findIndex((it) => num(it.left) + num(it.width) / 2 > s + 1);
  return i === -1 ? items.length - 1 : i;
}

/** A soft fade on the side(s) where more is hidden: a hint that the row continues. Works on any background colour. Nothing when nothing is hidden. */
export function fadeMask(e: Edges): string | undefined {
  if (!e.overflow) return undefined; const l = !e.atStart, r = !e.atEnd; if (!l && !r) return undefined;
  return `linear-gradient(to right, ${l ? "transparent 0, #000 28px" : "#000 0"}, ${r ? "#000 calc(100% - 40px), transparent 100%" : "#000 100%"})`;
}

/** What a screen reader hears. While the row scrolls: the current card ("Experiences: 2 of 4"). When everything already fits there is no "current" card: just how many there are. */
export const railStatus = (index: number, total: number, name: string, overflow = true, tr?: (text: string, vars?: Record<string, string | number>) => string): string => {
  if (total <= 0) return name; const n = Math.min(Math.max(index, 0), total - 1) + 1;
  if (tr) return overflow ? tr("{name}: {n} of {total}", { name, n, total }) : (total === 1 ? tr("{name}: {total} item", { name, total }) : tr("{name}: {total} items", { name, total }));
  return overflow ? `${name}: ${n} of ${total}` : `${name}: ${total} ${total === 1 ? "item" : "items"}`;
};
