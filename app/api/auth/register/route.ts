import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/account-verification";
import { clientIpFrom } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { LEGAL_VERSION } from "@/lib/site-info";
import { hashPassword } from "@/lib/password";
import { checkChosenPassword } from "@/lib/password-check";
import { checkPassword } from "@/lib/password-policy";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().max(1000), // the real rule is checkPassword below (it counts characters in any script)
  // Must be explicitly true: the person has accepted the Terms and acknowledged the Privacy Policy.
  acceptTerms: z.literal(true),
}).superRefine((d, ctx) => {
  const r = checkPassword(d.password, { email: d.email, name: d.name });
  if (!r.ok) ctx.addIssue({ code: "custom", path: ["password"], message: r.message });
});

export async function POST(request: Request) {
  // Sign-up costs us a password hash and an email, so one connection can't do it without limit. (Generous, because many phones
  // share one address on mobile networks. Counted in the database, so it holds across every server.)
  const ip = clientIpFrom(Object.fromEntries(request.headers.entries()));
  if (!await checkRateLimit(`register:${ip}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many sign-up attempts from this connection. Please try again in an hour.", code: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    if (!body || (body as { acceptTerms?: unknown }).acceptTerms !== true) {
      return NextResponse.json({ error: "Please accept the Terms of Use and Privacy Policy to create an account.", code: "terms" }, { status: 400 });
    }
    // A refused password says WHY by code too (reason and detail), so the page can say it in the person's own language.
    const why = (body as { password?: unknown; email?: unknown; name?: unknown } | null) ? checkPassword((body as { password?: unknown }).password, { email: String((body as { email?: unknown }).email ?? ""), name: String((body as { name?: unknown }).name ?? "") }) : null;
    return NextResponse.json(
      { error: parsed.error.issues.find((i) => i.code === "custom" && i.path[0] === "password")?.message ?? "Please check your name, email and password.", ...(why && !why.ok ? { code: "password", reason: why.reason, detail: why.detail } : {}) },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const full = await checkChosenPassword(password, { email, name }); // the rules passed; now: has it leaked in a known breach?
  if (!full.ok) return NextResponse.json({ error: full.message, code: "password", reason: full.reason }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists. If it's yours, use 'Forgot your password?' on the sign-in page.", code: "exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "MEMBER",
      // Proof of what they agreed to, and which version of the text it was.
      termsAcceptedAt: new Date(),
      termsVersion: LEGAL_VERSION,
    },
  });

  // Ask them to verify the address. Registration must never fail because an email couldn't be sent.
  try {
    await sendVerificationEmail(user.id);
  } catch (err) {
    console.error("[register] couldn't send the verification email", err);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
