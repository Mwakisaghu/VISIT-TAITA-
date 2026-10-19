import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { clearLoginFailures, clientIpFrom, isLoginBlocked, recordLoginFailure } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import { twoStepAvailable } from "@/lib/two-step/crypto";
import { parseMoneyFrom, requiresTwoStep, RESTRICTED_ROLE } from "@/lib/two-step/policy";
import { sendEmail } from "@/lib/email";
import { executeDueReset } from "@/lib/two-step/reset";
import { twoStepEnabled, verifyLoginCode } from "@/lib/two-step/service";
import { SESSION_MAX_AGE_SECONDS, staffSessionExpired } from "@/lib/session-limits";

// How long a login token may keep a role before it is re-checked against the database.
const ROLE_REFRESH_MS = 5 * 60 * 1000;
// Staff are re-checked far more often: a suspended or demoted administrator must lose access within about a minute.
const STAFF_REFRESH_MS = 60 * 1000;
// Two-step sign-in: who must have it (staff always; money-handling roles from a date) depends on settings read here, on the server.
const twoStepRule = () => ({ available: twoStepAvailable(), moneyRolesFrom: parseMoneyFrom() });
// Someone who must set up two-step but has not yet gets a session with NO privileges (their role is set aside, not removed), so every existing admin check refuses them with nothing to forget.
function setAsideRole(token: any, role: unknown) { token.heldRole = role; token.role = RESTRICTED_ROLE; token.twoStepSetupRequired = true; }
const refreshEvery = (role: unknown) => (ADMIN_ROLES.includes(role as string) ? STAFF_REFRESH_MS : ROLE_REFRESH_MS);

// A real bcrypt hash of a throwaway string, made once. Sign-in compares the password against THIS when the email is unknown,
// so rejecting an unknown address takes as long as rejecting a wrong password and doesn't reveal which addresses have accounts.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password")); // same cost as real hashes, so timing does not give accounts away

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" }, // the second step: a code from the authenticator app, or a recovery code
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const ip = clientIpFrom(req?.headers as Record<string, unknown> | undefined);

        // Too many recent failures: refuse outright — even with the right password, so a guesser can't tell when they hit it.
        if (await isLoginBlocked(email, ip)) throw new Error("TooManyAttempts");

        const user = await prisma.user.findUnique({ where: { email } });

        // Always compare against SOMETHING, so an unknown email takes as long to reject as a wrong password.
        const valid = await verifyPassword(credentials.password, user ? user.passwordHash : await getDummyHash());
        if (!user || !valid) {
          await recordLoginFailure(email, ip);
          return null;
        }
        await clearLoginFailures(email, ip);

        // A suspended account is refused only AFTER the password is right, so this message can't be used to find out which addresses have accounts.
        if (user.suspendedAt) throw new Error("AccountSuspended");

        // TWO-STEP SIGN-IN. The password was right. If this person has turned two-step on, they must ALSO give a code, and the code is checked here, before anything is issued: there is no way to a session around it.
        // A database error here refuses the sign-in (it never lets someone through); only a site that has never switched two-step on (no key set) carries on if its table is not there yet.
        // A super admin may have asked to reset this person's two-step (they lost their phone and codes) and the 24 hours may be up: it takes effect now, after the password was proved. If this ever fails (for example the table
        // is not there yet) it must NEVER block signing in: the reset simply does not happen, which is the safe side.
        if (twoStepAvailable()) { try { await executeDueReset(user.id, { mail: sendEmail }); } catch { /* never blocks sign-in */ } }
        let enabled = false;
        try { enabled = await twoStepEnabled(user.id); } catch (e) { if (twoStepAvailable()) throw e; }
        let mfa = false;
        if (enabled) {
          const typed = typeof (credentials as { code?: unknown }).code === "string" ? ((credentials as { code?: string }).code as string).trim() : "";
          if (!typed) throw new Error("TwoStepRequired"); // not a failure: the page now asks for the code
          const check = await verifyLoginCode(user.id, typed, { ip });
          if (!check.ok) throw new Error(check.reason === "rate_limited" ? "TooManyAttempts" : check.reason === "unavailable" ? "TwoStepUnavailable" : "InvalidCode");
          mfa = true;
        }
        // Passwords stored with an older, cheaper setting are upgraded now, while we hold the correct password. A failure here changes nothing: they are signed in with the old hash.
        if (needsRehash(user.passwordHash)) {
          try { await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(credentials.password) } }); } catch { /* try again at the next sign-in */ }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfa,
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
        (token as any).mfa = (user as any).mfa === true;
        if (requiresTwoStep((user as any).role, twoStepRule()) && (user as any).mfa !== true) setAsideRole(token, (user as any).role); // must set up two-step first
        return token;
      }

      // Staff sign-ins last at most 12 hours, however busy they are (refreshing a token does not reset this clock), so a stolen admin cookie cannot stay useful for weeks.
      if (staffSessionExpired(token)) throw new Error("SessionEnded");

      // The role used to be read once at sign-in and then trusted for the life of the
      // token (30 days by default) — so a promotion (e.g. approved as a creator) didn't
      // apply until the next sign-in, and a DEMOTED admin or editor kept their access.
      // Re-read it from the database at most every few minutes instead.
      const checkedAt = typeof (token as any).roleCheckedAt === "number" ? (token as any).roleCheckedAt : 0;
      if (token.id && ((token as any).twoStepSetupRequired === true || Date.now() - checkedAt > refreshEvery(token.role))) { // someone still setting up two-step is re-read on every request, so finishing it takes effect at once
        let sessionEnded = false;
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, passwordChangedAt: true, suspendedAt: true, sessionsRevokedAt: true },
          });
          token.role = fresh ? fresh.role : "VISITOR"; // a deleted account loses its access
          // Two-step: someone who must have it but has not set it up stays without privileges; the moment they have, their role comes back. A database error keeps the safe side.
          if (fresh && requiresTwoStep(fresh.role, twoStepRule())) {
            let enabled = false; try { enabled = await twoStepEnabled(token.id as string); } catch { enabled = (token as any).mfa === true; }
            if (enabled) { (token as any).mfa = true; (token as any).twoStepSetupRequired = false; delete (token as any).heldRole; } else setAsideRole(token, fresh.role);
          } else { (token as any).twoStepSetupRequired = false; delete (token as any).heldRole; }
          (token as any).roleCheckedAt = Date.now();

          // The password was changed AFTER this sign-in: whoever has this session (maybe not the owner) must sign in again.
          const signedInAt = typeof (token as any).signedInAt === "number" ? (token as any).signedInAt : 0;
          if (fresh?.passwordChangedAt && signedInAt < fresh.passwordChangedAt.getTime()) sessionEnded = true;
          // An administrator suspended the account, or chose "sign out everywhere" after this sign-in.
          if (fresh?.suspendedAt) sessionEnded = true;
          if (fresh?.sessionsRevokedAt && signedInAt < fresh.sessionsRevokedAt.getTime()) sessionEnded = true;
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
        (session.user as any).twoStepSetupRequired = (token as any).twoStepSetupRequired === true;
      }
      return session;
    },
  },
};

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
