import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// How long a login token may keep a role before it is re-checked against the database.
const ROLE_REFRESH_MS = 5 * 60 * 1000;

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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
        return token;
      }

      // The role used to be read once at sign-in and then trusted for the life of the
      // token (30 days by default) — so a promotion (e.g. approved as a creator) didn't
      // apply until the next sign-in, and a DEMOTED admin or editor kept their access.
      // Re-read it from the database at most every few minutes instead.
      const checkedAt = typeof (token as any).roleCheckedAt === "number" ? (token as any).roleCheckedAt : 0;
      if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          token.role = fresh ? fresh.role : "VISITOR"; // a deleted account loses its access
          (token as any).roleCheckedAt = Date.now();
        } catch {
          // Database hiccup: keep the current role and try again on the next request.
        }
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
