import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/account-verification";
import { clientIpFrom } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { LEGAL_VERSION } from "@/lib/site-info";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  // Must be explicitly true: the person has accepted the Terms and acknowledged the Privacy Policy.
  acceptTerms: z.literal(true),
});

export async function POST(request: Request) {
  // Sign-up costs us a password hash and an email, so one connection can't do it without limit. (Generous, because many phones
  // share one address on mobile networks. Counted in the database, so it holds across every server.)
  const ip = clientIpFrom(Object.fromEntries(request.headers.entries()));
  if (!await checkRateLimit(`register:${ip}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many sign-up attempts from this connection. Please try again in an hour." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    if (!body || (body as { acceptTerms?: unknown }).acceptTerms !== true) {
      return NextResponse.json({ error: "Please accept the Terms of Use and Privacy Policy to create an account." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Please check your name, email and password (8+ characters)." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists. If it's yours, use 'Forgot your password?' on the sign-in page." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

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
