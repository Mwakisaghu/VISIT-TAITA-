// Turns the Content-Security-Policy violation reports browsers send into one small, safe summary. Kept out of the route file because a Next.js route file may only export its HTTP handlers.
// It keeps NO personal data: not the visitor's address, not their browser, not query strings.
const clean = (v: unknown, n = 200): string => { const s = typeof v === "string" ? v : ""; try { const u = new URL(s); return (u.origin + u.pathname).slice(0, n); } catch { return s.replace(/[?#].*$/, "").replace(/[\u0000-\u001f]/g, " ").slice(0, n); } };

/** Turns the two report formats browsers use into one small, safe summary (or null if it is not a policy report). */
export function summarise(body: unknown): { directive: string; blocked: string; page: string } | null {
  const b = body as any; const r = b?.["csp-report"] ?? (Array.isArray(b) ? b.find((x: any) => x?.type === "csp-violation")?.body : b?.body) ?? null;
  if (!r || typeof r !== "object") return null;
  const directive = clean(r["effective-directive"] ?? r["violated-directive"] ?? r.effectiveDirective ?? r.violatedDirective, 60); const blocked = clean(r["blocked-uri"] ?? r.blockedURL ?? r.blockedUri, 200); const page = clean(r["document-uri"] ?? r.documentURL ?? r.documentUri, 120);
  if (!directive) return null; return { directive, blocked: blocked || "(inline or eval)", page: (() => { try { return new URL(page).pathname; } catch { return page; } })() };
}
