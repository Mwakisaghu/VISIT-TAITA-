import type { Metadata } from "next";
import Link from "next/link";
import TokenActionForm from "@/components/newsletter/TokenActionForm";
import { maskEmail } from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false, follow: false } };

// Depends on a private token and live state — never cached or indexed.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-lg">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Confirm your subscription</h1>
        <div className="mt-6">{children}</div>
        <p className="mt-10 font-body text-xs text-stone/50">
          <Link href="/privacy" className="underline hover:text-rust">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Opening this link only SHOWS a button. Nothing happens until it is pressed, because email security scanners open every
 * link in a message and would otherwise confirm people by accident.
 */
export default async function NewsletterTokenPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const sub = token && token.length <= 64 ? await prisma.newsletterSubscriber.findUnique({ where: { token }, select: { email: true, status: true, confirmedAt: true } }) : null;

  if (!sub) {
    return (
      <Shell>
        <p className="font-body text-stone/70">This link isn&apos;t valid or has already been used.</p>
      </Shell>
    );
  }

  if (sub.status === "ACTIVE" && sub.confirmedAt) {
    return (
      <Shell>
        <p className="font-body text-stone/70">You&apos;re already confirmed — nothing more to do. Karibu.</p>
      </Shell>
    );
  }
  if (sub.status === "UNSUBSCRIBED") {
    return (
      <Shell>
        <p className="font-body text-stone/70">You&apos;ve unsubscribed, so this link no longer works. You&apos;re welcome to sign up again from the bottom of any page.</p>
      </Shell>
    );
  }

  const masked = maskEmail(sub.email);
  return (
    <Shell>
      <p className="font-body text-lg text-stone/80">
        Confirm that <strong>{masked}</strong> should receive the Visit Taita letter?
      </p>
      <p className="mt-2 font-body text-sm text-stone/60">About once a month. You can unsubscribe at any time from any email.</p>
      <div className="mt-6">
        <TokenActionForm mode="confirm" token={token} />
      </div>
    </Shell>
  );
}
