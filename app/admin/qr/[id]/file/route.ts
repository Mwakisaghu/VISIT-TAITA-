import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { qrReadiness, shortUrl } from "@/lib/go";
import { prisma } from "@/lib/prisma";
import { qrPng, qrSvg } from "@/lib/qr-code";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** Downloads a link's QR code: ?format=svg (vector, for printers) or ?format=png&size=2000. Admin only. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Please sign in.", { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role)) return new NextResponse("Admin access required.", { status: 403 });

  const link = await prisma.shortLink.findUnique({ where: { id: params.id }, select: { slug: true } });
  if (!link) return new NextResponse("Not found.", { status: 404 });

  // Refuse to make anything printable for an address that would be useless on a shirt.
  const ready = qrReadiness(getSiteUrl());
  if (!ready.ok) return new NextResponse(ready.reason, { status: 409 });

  const url = new URL(request.url).searchParams;
  const format = url.get("format") === "png" ? "png" : "svg";
  const file = `visit-taita-qr-${link.slug}`;
  const common = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const target = shortUrl(ready.base, link.slug);

  if (format === "svg") {
    return new NextResponse(await qrSvg(target), { headers: { ...common, "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.svg"` } });
  }
  const size = Number(url.get("size"));
  const png = await qrPng(target, Number.isFinite(size) && size > 0 ? size : 2000);
  return new NextResponse(new Uint8Array(png), { headers: { ...common, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${file}.png"` } });
}
