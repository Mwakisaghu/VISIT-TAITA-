import { NextResponse } from "next/server";

// Collects Content-Security-Policy violation reports (the browser sends them when the site's policy would have blocked something).
// It keeps NO personal data: not the visitor's address, not their browser, not query strings. It always answers "no content", whatever it was sent, and cannot be used to fill the logs (limited per minute).
const MAX_BYTES = 8 * 1024; const PER_MINUTE = 60; let windowStart = 0; let seen = 0;
const clean = (v: unknown, n = 200): string => { const s = typeof v === "string" ? v : ""; try { const u = new URL(s); return (u.origin + u.pathname).slice(0, n); } catch { return s.replace(/[?#].*$/, "").replace(/[\u0000-\u001f]/g, " ").slice(0, n); } };

/** Turns the two report formats browsers use into one small, safe summary (or null if it is not a policy report). */
export function summarise(body: unknown): { directive: string; blocked: string; page: string } | null {
  const b = body as any; const r = b?.["csp-report"] ?? (Array.isArray(b) ? b.find((x: any) => x?.type === "csp-violation")?.body : b?.body) ?? null;
  if (!r || typeof r !== "object") return null;
  const directive = clean(r["effective-directive"] ?? r["violated-directive"] ?? r.effectiveDirective ?? r.violatedDirective, 60); const blocked = clean(r["blocked-uri"] ?? r.blockedURL ?? r.blockedUri, 200); const page = clean(r["document-uri"] ?? r.documentURL ?? r.documentUri, 120);
  if (!directive) return null; return { directive, blocked: blocked || "(inline or eval)", page: (() => { try { return new URL(page).pathname; } catch { return page; } })() };
}

export async function POST(request: Request) {
  try {
    const now = Date.now(); if (now - windowStart > 60_000) { windowStart = now; seen = 0; } if (++seen > PER_MINUTE) return new NextResponse(null, { status: 204 });
    const text = await request.text(); if (text.length > MAX_BYTES) return new NextResponse(null, { status: 204 });
    const s = summarise(JSON.parse(text)); if (s) console.warn("[csp]", JSON.stringify(s));
  } catch { /* a malformed report is ignored */ }
  return new NextResponse(null, { status: 204 });
}
