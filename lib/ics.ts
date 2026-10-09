// A one-event calendar file (.ics) that opens in Google, Apple and Outlook calendars.
// No end time is written because events have only a start: calendars show it as a point in time, not as an invented duration.
const esc = (s: string): string => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
// Lines longer than 75 bytes are folded onto continuation lines that begin with a space (RFC 5545), never splitting a multi-byte character.
export function fold(line: string): string {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ""; bytes = 0; } cur += ch; bytes += b; }
  out.push(cur); return out.join("\r\n ");
}
export function buildEventIcs(e: { uid: string; title: string; start: Date; location?: string; description?: string; url?: string }, now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Visit Taita//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${e.uid.replace(/[^A-Za-z0-9@.-]/g, "")}@visittaita`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(e.start)}`, `SUMMARY:${esc(e.title)}`];
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  if (e.url && /^https?:\/\//i.test(e.url)) lines.push(`URL:${e.url.replace(/[\r\n]/g, "")}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
