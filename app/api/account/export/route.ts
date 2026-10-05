import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { buildAccountExport } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Personal data: never cached, never shared between users.
export const dynamic = "force-dynamic";

/**
 * Downloads everything the platform holds about the signed-in person, as a JSON file. It only ever returns the
 * caller's OWN data (the user id comes from the session, never from the request), and is rate-limited.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  if (!rateLimit(`account-export:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many downloads — please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const data = await buildAccountExport(session.user.id);
  if (!data) return NextResponse.json({ error: "This account no longer exists." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="visit-taita-my-data-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
