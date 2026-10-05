import type { Metadata } from "next";
import Link from "next/link";
import VerifyEmailButton from "@/components/account/VerifyEmailButton";
import { findUsableToken } from "@/lib/account-tokens";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };

// Depends on a private token and live state — never cached or indexed.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-lg">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Verify your email</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Opening this link only SHOWS a button. Nothing happens until it is pressed, because email security scanners open every link
 * in a message and would otherwise verify addresses (or use up the link) on the person's behalf.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const usable = token ? await findUsableToken(prisma, token, "VERIFY_EMAIL") : null;

  if (!usable) {
    return (
      <Shell>
        <p className="font-body text-stone/70">This link isn&apos;t valid or has expired.</p>
        <p className="mt-3 font-body text-stone/70">
          Sign in and use <Link href="/account" className="underline hover:text-rust">your account page</Link> to send yourself a new one.
        </p>
      </Shell>
    );
  }
  return (
    <Shell>
      <p className="font-body text-lg text-stone/80">Confirm that this is your email address, so you can write reviews and apply to the Field Crew.</p>
      <div className="mt-6">
        <VerifyEmailButton token={token} />
      </div>
    </Shell>
  );
}
