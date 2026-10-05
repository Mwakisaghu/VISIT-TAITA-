import { NextResponse } from "next/server";
import { unsubscribeWithToken } from "@/lib/actions/newsletter";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "";
}

/**
 * One-click unsubscribe (RFC 8058). Mail apps POST here when someone taps "Unsubscribe" in their inbox, which is what
 * Gmail and Yahoo expect from bulk senders. No sign-in: the unguessable token in the URL is the credential.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (ip && !rateLimit(`unsubscribe:${ip}`, 60, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await unsubscribeWithToken(token);
  return result.ok ? new NextResponse(null, { status: 200 }) : NextResponse.json({ error: result.error }, { status: 404 });
}

/**
 * A GET never unsubscribes anyone: link scanners fetch every link in an email, and would unsubscribe people by accident.
 * It sends the browser to the page that asks first.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(new URL(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, request.url));
}
