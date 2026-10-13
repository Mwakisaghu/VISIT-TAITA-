import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, type Locale } from "@/lib/i18n/config";
import { decide } from "@/lib/i18n/routing";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];

// The admin area: signed-in staff only (exactly as before).
const adminGate = withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    if (!token || !ADMIN_ROLES.includes(token.role as string)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token }, pages: { signIn: "/login" } },
);

const remember = (res: NextResponse, l: Locale) => { res.cookies.set(LOCALE_COOKIE, l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" }); return res; };

// Everything else: which language this page is in.
export default function middleware(req: NextRequest, event: any) {
  if (req.nextUrl.pathname === "/admin" || req.nextUrl.pathname.startsWith("/admin/")) return (adminGate as any)(req, event);
  const d = decide({ pathname: req.nextUrl.pathname, search: req.nextUrl.search, cookie: req.cookies.get(LOCALE_COOKIE)?.value, method: req.method });
  const headers = new Headers(req.headers);
  if (d.action === "redirect") { const url = req.nextUrl.clone(); const [p, q] = d.to.split("?"); url.pathname = p; url.search = q ? "?" + q : ""; const res = NextResponse.redirect(url, d.status); return d.remember ? remember(res, d.remember) : res; }
  headers.set(LOCALE_HEADER, d.locale);
  if (d.action === "rewrite") { const url = req.nextUrl.clone(); const [p, q] = d.to.split("?"); url.pathname = p; url.search = q ? "?" + q : ""; return remember(NextResponse.rewrite(url, { request: { headers } }), d.remember); }
  return NextResponse.next({ request: { headers } });
}

// Pages (not the API, Next's own files, images or anything with a file extension) and the admin area.
export const config = { matcher: ["/admin/:path*", "/((?!api(?:/|$)|_next(?:/|$)|partner(?:/|$)|brand(?:/|$)|p(?:/|$)|.*\\..*).*)"] };
