import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QrCheckinConfirm from "@/components/passport/QrCheckinConfirm";
import { canOptimize } from "@/lib/image-src";

export const metadata: Metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

// Per-visitor and token-specific: never prerender or cache.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-md overflow-hidden rounded-sm border border-stone/10 bg-parchment">
        {children}
      </div>
    </div>
  );
}

export default async function CheckinPage({ params }: { params: { token: string } }) {
  const token = params.token.trim();

  const [session, destination] = await Promise.all([
    getServerSession(authOptions),
    prisma.destination.findFirst({
      where: { checkinToken: token, status: "PUBLISHED" },
      select: { id: true, name: true, region: true, image: true },
    }),
  ]);

  if (!destination) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <p className="font-display text-2xl text-stone">This check-in code isn&apos;t valid.</p>
          <p className="mt-3 font-body text-sm text-stone/60">
            The plaque may have been replaced. Try the &quot;Check in here&quot; button on your Passport instead.
          </p>
          <Link
            href="/passport"
            className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
          >
            Go to my Passport
          </Link>
        </div>
      </Shell>
    );
  }

  const alreadyCheckedIn = session?.user
    ? !!(await prisma.pointsEntry.findFirst({
        where: { userId: session.user.id, destinationId: destination.id, reason: "CHECKIN" },
        select: { id: true },
      }))
    : false;

  const next = encodeURIComponent(`/checkin/${token}`);

  return (
    <Shell>
      <div className="relative h-44 w-full bg-stone">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          unoptimized={!canOptimize(destination.image)}
          priority
          sizes="448px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-body text-xs text-ochre">{destination.region}</p>
          <p className="font-display text-2xl text-parchment">{destination.name}</p>
        </div>
      </div>

      <div className="p-6">
        {!session?.user ? (
          <div className="flex flex-col gap-3">
            <p className="font-body text-sm text-stone/70">
              Sign in to check in here and earn points for your Taita Passport.
            </p>
            <Link
              href={`/login?next=${next}`}
              className="focus-ring rounded-full bg-rust px-6 py-3 text-center font-body text-sm text-parchment hover:bg-rust-deep"
            >
              Sign in to check in
            </Link>
            <Link
              href={`/register?next=${next}`}
              className="focus-ring rounded-full border border-stone/25 px-6 py-3 text-center font-body text-sm text-stone hover:border-rust hover:text-rust"
            >
              Create a Passport
            </Link>
          </div>
        ) : alreadyCheckedIn ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-sm text-canopy">
              You&apos;ve already checked in at {destination.name}. ✓
            </p>
            <Link
              href="/passport"
              className="focus-ring rounded-full border border-stone/25 px-6 py-3 text-center font-body text-sm text-stone hover:border-rust hover:text-rust"
            >
              View my Passport
            </Link>
          </div>
        ) : (
          <QrCheckinConfirm token={token} destinationName={destination.name} />
        )}
      </div>
    </Shell>
  );
}
