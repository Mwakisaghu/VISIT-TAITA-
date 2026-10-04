import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CreatorApplyForm from "@/components/creators/CreatorApplyForm";
import CreatorGuidelines from "@/components/creators/CreatorGuidelines";

export const metadata: Metadata = { title: "Join the Field Crew" };

// Depends on who is signed in and their application state — never cached.
export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/creators" className="font-body text-sm text-stone/60 hover:text-rust">
          ← The Field Crew
        </Link>
        <h1 className="mt-6 font-display text-4xl text-stone sm:text-5xl">Join the Field Crew</h1>
        {children}
      </div>
    </div>
  );
}

export default async function CreatorApplyPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const next = encodeURIComponent("/creators/apply");
    return (
      <Shell>
        <p className="mt-4 max-w-prose font-body text-stone/70">
          Sign in or create a free Taita Passport first — it&apos;s how we link your application to your account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/login?next=${next}`}
            className="focus-ring rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
          >
            Sign in
          </Link>
          <Link
            href={`/register?next=${next}`}
            className="focus-ring rounded-full border border-stone/25 px-7 py-3 font-body text-sm text-stone hover:border-rust hover:text-rust"
          >
            Create a Passport
          </Link>
        </div>
      </Shell>
    );
  }

  const userId = session.user.id;
  const [creator, pending, rejected] = await Promise.all([
    prisma.creator.findUnique({ where: { userId }, select: { slug: true, displayName: true, status: true } }),
    prisma.creatorApplication.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.creatorApplication.findFirst({
      where: { userId, status: "REJECTED" },
      orderBy: { reviewedAt: "desc" },
      select: { rejectionReason: true },
    }),
  ]);

  if (creator) {
    return (
      <Shell>
        <p className="mt-4 max-w-prose font-body text-stone/70">
          You&apos;re already in the Field Crew, {creator.displayName}.
          {creator.status === "PAUSED" ? " Your profile is currently paused — get in touch if that's unexpected." : ""}
        </p>
        {creator.status === "ACTIVE" && (
          <Link
            href={`/creators/${creator.slug}`}
            className="focus-ring mt-6 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
          >
            View your profile
          </Link>
        )}
      </Shell>
    );
  }

  if (pending) {
    return (
      <Shell>
        <div role="status" className="mt-6 max-w-prose rounded-sm border border-ochre/50 bg-ochre/10 p-5">
          <p className="font-display text-xl text-stone">Your application is under review.</p>
          <p className="mt-2 font-body text-sm text-stone/70">
            You applied on {formatDate(pending.createdAt)}. We&apos;ll email you at your account address once
            we&apos;ve decided.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-4 max-w-prose font-body text-lg text-stone/70">
        We&apos;re building a crew of local storytellers and visiting creators who show Taita as it really is —
        with real evidence and honest disclosure.
      </p>

      {rejected && (
        <div role="status" className="mt-6 max-w-prose rounded-sm border border-stone/15 bg-stone/5 p-4">
          <p className="font-body text-sm text-stone">
            Your last application wasn&apos;t approved
            {rejected.rejectionReason ? `: ${rejected.rejectionReason}` : "."} You&apos;re welcome to apply again.
          </p>
        </div>
      )}

      <div className="mt-10">
        <CreatorGuidelines />
      </div>

      <div className="mt-10">
        <CreatorApplyForm defaultName={session.user.name ?? ""} />
      </div>
    </Shell>
  );
}
