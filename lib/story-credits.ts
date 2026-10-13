// Sources and credits for a story: one per line, "Title | Author or publisher | https://link". The author and the link are optional.
// Pure functions. Links are only ever http or https, so a credit can never carry a script address.
export const MAX_CREDITS = 8;
export type Credit = { title: string; by: string | null; url: string | null };
const squash = (s: string, n: number) => s.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const asUrl = (s: string): string | null => { const t = s.trim(); if (!/^https?:\/\/[^\s<>"']+$/i.test(t) || t.length > 400) return null; try { const u = new URL(t); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null; } catch { return null; } };

/** Reads the lines leniently (for showing a story): lines that are not usable are skipped, never an error. */
export function readCredits(text: string | null | undefined): Credit[] {
  const out: Credit[] = [];
  for (const line of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const parts = line.split("|").map((p) => p.trim()); const title = squash(parts[0] ?? "", 200); if (!title) continue;
    let by: string | null = null, url: string | null = null;
    for (const p of parts.slice(1)) { if (!p) continue; const u = asUrl(p); if (u && !url) url = u; else if (!u && !by && !/^[a-z][a-z0-9+.-]*:/i.test(p)) by = squash(p, 160); } // anything that looks like a web address or a script (scheme:…) is never shown as a name
    out.push({ title, by, url }); if (out.length >= MAX_CREDITS) break;
  }
  return out;
}

/** Checks what an editor typed, strictly (for saving): returns the tidy text to store, or what to fix. */
export function normalizeCredits(text: string | null | undefined): { ok: true; value: string | null } | { ok: false; error: string } {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: true, value: null };
  if (lines.length > MAX_CREDITS) return { ok: false, error: `At most ${MAX_CREDITS} sources and credits (one per line).` };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.split("|").map((p) => p.trim()); const title = squash(parts[0] ?? "", 200);
    if (!title) return { ok: false, error: `Credit ${i + 1}: start the line with the title of the source.` };
    if (parts.length > 3) return { ok: false, error: `Credit ${i + 1}: use at most three parts: Title | Author | https://link.` };
    let by: string | null = null, url: string | null = null;
    for (const p of parts.slice(1)) {
      if (!p) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(p)) { const u = asUrl(p); if (!u) return { ok: false, error: `Credit ${i + 1}: the link must start with http:// or https:// (got "${squash(p, 40)}").` }; url = u; } else by = squash(p, 160);
    }
    out.push([title, by, url].filter(Boolean).join(" | "));
  }
  return { ok: true, value: out.join("\n") };
}
