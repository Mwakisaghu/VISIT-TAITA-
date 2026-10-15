import { NextResponse } from "next/server";
import { summarise } from "@/lib/csp-report";

// Collects Content-Security-Policy violation reports (the browser sends them when the site's policy would have blocked something).
// It keeps NO personal data: not the visitor's address, not their browser, not query strings. It always answers "no content", whatever it was sent, and cannot be used to fill the logs (limited per minute).
const MAX_BYTES = 8 * 1024; const PER_MINUTE = 60; let windowStart = 0; let seen = 0;
export async function POST(request: Request) {
  try {
    const now = Date.now(); if (now - windowStart > 60_000) { windowStart = now; seen = 0; } if (++seen > PER_MINUTE) return new NextResponse(null, { status: 204 });
    const text = await request.text(); if (text.length > MAX_BYTES) return new NextResponse(null, { status: 204 });
    const s = summarise(JSON.parse(text)); if (s) console.warn("[csp]", JSON.stringify(s));
  } catch { /* a malformed report is ignored */ }
  return new NextResponse(null, { status: 204 });
}
