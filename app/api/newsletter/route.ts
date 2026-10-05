import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/actions/newsletter";

/**
 * Starts a newsletter subscription. It does NOT add anyone to the list: it emails a confirmation link (double opt-in),
 * and the reply is the same whether or not the address was already known.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || null;

  const result = await subscribeToNewsletter(String((body as { email?: unknown } | null)?.email ?? ""), ip);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
