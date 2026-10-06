import { NextResponse } from "next/server";
import { isBot, recordClick, resolveLink } from "@/lib/go";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// This is what a printed QR code opens. Rules that matter on a shirt that can't be recalled:
//  - it ALWAYS redirects (an unknown, switched-off or broken link goes to the home page — never an error page);
//  - it is a temporary (302) redirect that is never cached, so changing a link's destination takes effect at once;
//  - counting a scan is best-effort and can never delay or break the redirect.
function destination(target: string | null): URL {
  const base = getSiteUrl();
  try {
    return target && target.startsWith("/") ? new URL(target, base) : target ? new URL(target) : new URL("/", base);
  } catch {
    return new URL("/", base);
  }
}

const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const link = await resolveLink(prisma, params.slug);
  if (link && !isBot(request.headers.get("user-agent"))) {
    try {
      await recordClick(prisma as never, link);
    } catch (err) {
      console.error("[go] couldn't count a scan:", (err as Error).message);
    }
  }
  return NextResponse.redirect(destination(link?.target ?? null), { status: 302, headers });
}

// Link checkers and previews often HEAD first; that is not a scan.
export async function HEAD(_request: Request, { params }: { params: { slug: string } }) {
  const link = await resolveLink(prisma, params.slug);
  return NextResponse.redirect(destination(link?.target ?? null), { status: 302, headers });
}
