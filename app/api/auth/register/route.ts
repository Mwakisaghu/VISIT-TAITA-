import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LEGAL_VERSION } from "@/lib/site-info";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  // Must be explicitly true: the person has accepted the Terms and acknowledged the Privacy Policy.
  acceptTerms: z.literal(true),
});

export async function POST(request: Request) {
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
      { error: "An account with that email already exists." },
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

  return NextResponse.json({ id: user.id, email: user.email });
}
