// A calendar file for a plan: one event per stop that has a time. (Stays and untimed stops are left out, because a calendar needs a start.)
const esc = (s: string): string => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
function fold(line: string): string {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ""; bytes = 0; } cur += ch; bytes += b; }
  out.push(cur); return out.join("\r\n ");
}
export type IcsStop = { start: Date; durationMin: number; name: string; location?: string; url?: string };
export function buildPlanIcs(plan: { token: string; title: string; stops: IcsStop[] }, now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Visit Taita//Day plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(plan.title)}`];
  plan.stops.forEach((s, i) => {
    lines.push("BEGIN:VEVENT", `UID:${plan.token.replace(/[^A-Za-z0-9]/g, "")}-${i + 1}@visittaita`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(new Date(s.start.getTime() + Math.max(5, s.durationMin) * 60_000))}`, `SUMMARY:${esc(s.name)}`);
    if (s.location) lines.push(`LOCATION:${esc(s.location)}`);
    if (s.url && /^https?:\/\//i.test(s.url)) lines.push(`URL:${s.url.replace(/[\r\n]/g, "")}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR"); return lines.map(fold).join("\r\n") + "\r\n";
}
