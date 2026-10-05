import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clearLoginFailures, clientIpFrom, isLoginBlocked, recordLoginFailure } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";

// How long a login token may keep a role before it is re-checked against the database.
const ROLE_REFRESH_MS = 5 * 60 * 1000;

// A real bcrypt hash of a throwaway string, made once. Sign-in compares the password against THIS when the email is unknown,
// so rejecting an unknown address takes as long as rejecting a wrong password and doesn't reveal which addresses have accounts.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 10));

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const ip = clientIpFrom(req?.headers as Record<string, unknown> | undefined);

        // Too many recent failures: refuse outright — even with the right password, so a guesser can't tell when they hit it.
        if (isLoginBlocked(email, ip)) throw new Error("TooManyAttempts");

        const user = await prisma.user.findUnique({ where: { email } });

        // Always compare against SOMETHING, so an unknown email takes as long to reject as a wrong password.
        const valid = await bcrypt.compare(credentials.password, user ? user.passwordHash : await getDummyHash());
        if (!user || !valid) {
          recordLoginFailure(email, ip);
          return null;
        }
        clearLoginFailures(email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        (token as any).roleCheckedAt = Date.now();
        // When THIS sign-in happened (the token's own iat is reset on every refresh, so it can't be used for this).
        (token as any).signedInAt = Date.now();
        return token;
      }

      // The role used to be read once at sign-in and then trusted for the life of the
      // token (30 days by default) — so a promotion (e.g. approved as a creator) didn't
      // apply until the next sign-in, and a DEMOTED admin or editor kept their access.
      // Re-read it from the database at most every few minutes instead.
      const checkedAt = typeof (token as any).roleCheckedAt === "number" ? (token as any).roleCheckedAt : 0;
      if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        let sessionEnded = false;
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, passwordChangedAt: true },
          });
          token.role = fresh ? fresh.role : "VISITOR"; // a deleted account loses its access
          (token as any).roleCheckedAt = Date.now();

          // The password was changed AFTER this sign-in: whoever has this session (maybe not the owner) must sign in again.
          const signedInAt = typeof (token as any).signedInAt === "number" ? (token as any).signedInAt : 0;
          if (fresh?.passwordChangedAt && signedInAt < fresh.passwordChangedAt.getTime()) sessionEnded = true;
        } catch {
          // Database hiccup: keep the current role and try again on the next request.
        }
        // Thrown OUTSIDE the try above (which would swallow it): NextAuth then clears the session cookie and treats this
        // request as signed out.
        if (sessionEnded) throw new Error("SessionEnded");
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
