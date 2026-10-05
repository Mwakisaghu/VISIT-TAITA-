import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/account/ResetPasswordForm";
import { findUsableToken } from "@/lib/account-tokens";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

// Depends on a private token and live state — never cached or indexed.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-lg">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Choose a new password</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Opening the link only shows the form (and checks the link is still good). Nothing changes until a new password is submitted. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const usable = token ? await findUsableToken(prisma, token, "RESET_PASSWORD") : null;

  if (!usable) {
    return (
      <Shell>
        <p className="font-body text-stone/70">This link isn&apos;t valid or has expired. Reset links work once, for an hour.</p>
        <p className="mt-3 font-body text-stone/70">
          <Link href="/forgot-password" className="underline hover:text-rust">Request a new one</Link>.
        </p>
      </Shell>
    );
  }
  return (
    <Shell>
      <ResetPasswordForm token={token} />
    </Shell>
  );
}
